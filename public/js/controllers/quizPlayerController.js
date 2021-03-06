//Copyright {2016} {NIIT Limited, Wipro Limited}
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//
//   Name of Developers  Raghav Goel, Kshitij Jain, Lakshay Bansal, Ayush Jain, Saurabh Gupta, Akshay Meher
//                      + Anil Sawant

angular.module('quizRT')
    .controller('quizPlayerController', function($route, $scope, $location, $interval, $http, $rootScope, $window) {
      if ( !$rootScope.loggedInUser ) {
        $rootScope.isAuthenticatedCookie = false;
        $rootScope.serverErrorMsg = 'User not authenticated.';
        $rootScope.serverErrorStatus = 401;
        $rootScope.serverErrorStatusText = 'You are not logged in. Kindly do a fresh login.';
        $location.path('/error');
      } else {
        $scope.levelId = $rootScope.playGame.levelId;
        $scope.topicId = $rootScope.playGame.topicId;
        $scope.quizTitle = $rootScope.playGame.topicName;
        $scope.tournamentTitle = $rootScope.playGame.tournamentTitle;
        if ( $scope.levelId && $scope.levelId.length ) {
          $scope.roundCount = $scope.levelId.substring($scope.levelId.lastIndexOf("_") + 1);
        }
        $rootScope.stylesheetName = "quizPlayer";
        $scope.myscore = 0;
        $scope.correctAnswerers = 0;
        $scope.wrongAnswerers = 0;
        $scope.quizTitle = $rootScope.title;
        var playersPerMatch = $rootScope.playersPerMatch;
        $scope.pendingUsersCount = playersPerMatch;
        //$scope.question = "WAITING FOR " + playersPerMatch +" OTHER PLAYERS";
        console.log("WAITING FOR " + playersPerMatch +" OTHER PLAYERS");

        // levelId is defined for Tournaments only
        if($scope.levelId){
             $scope.levelDetails = "Round "+ $scope.roundCount + " : " + $scope.tournamentTitle;
        }else{
            $scope.levelDetails = "";
        }
        // watch when the user leaves the quiz-play page to show/hide footer nav
        $scope.$on( '$routeChangeStart', function(args) {
          $rootScope.isPlayingAGame = false;
        });

        // create the playerData obj for the quiz gameManager to identify the player and his client
        var playerData = {
            levelId: $scope.levelId, // defined only for Tournaments
            topicId: $scope.topicId,
            userId: $rootScope.loggedInUser.userId,
            playerName: $rootScope.loggedInUser.name,
            playerPic: $rootScope.loggedInUser.imageLink,
            playersPerMatch: playersPerMatch
        };
        $rootScope.socket.emit('join', playerData); // enter the game and wait for other players to join

        $rootScope.socket.on( 'userNotAuthenticated', function() {
            $rootScope.isAuthenticatedCookie = false;
            $rootScope.serverErrorMsg = 'User not authenticated.';
            $rootScope.serverErrorStatus = 401;
            $rootScope.serverErrorStatusText = 'User session could not be found. kindly do a fresh login.';
            $location.path('/error');
            console.log('Problem maintaining the user session!');
        });

        $rootScope.socket.on('startGame', function( startGameData ) {
          if ( startGameData.questions && startGameData.questions.length && startGameData.questions[0]) {
            $rootScope.freakgid = startGameData.gameId;
            $scope.questionCounter = 0; // reset the questionCounter for each game
            $scope.question = "Starting Game ...";
            $scope.time = 3;

            var timeInterval = $interval( function() {
                $scope.time--;

                //waiting for counter to end to start the Quiz
                if ($scope.time === 0) {
                    $scope.isDisabled = false;
                    $scope.wrongAnswerers = 0;
                    $scope.correctAnswerers = 0;
                    $scope.unattempted = startGameData.playersNeeded;
                    if ( $scope.questionCounter == startGameData.questions.length ) {
                        $interval.cancel(timeInterval);
                        $rootScope.finalScore = $scope.myscore;
                        $rootScope.finalRank = $scope.myrank;
                        $rootScope.socket.emit( 'gameFinished', { gameId: startGameData.gameId, topicId: startGameData.topicId, levelId: $scope.levelId } );
                    } else {
                        $scope.temp = loadNextQuestion( startGameData.questions, $scope.questionCounter, $scope);

                        $scope.changeColor = function(id, element) {
                            if (id == "option" + ($scope.temp.correctIndex)) {
                                $(element.target).addClass('btn-success');
                                $scope.myscore = $scope.myscore + $scope.time + 10;
                                $rootScope.socket.emit('confirmAnswer', {
                                    ans: "correct",
                                    gameId: startGameData.gameId,
                                    topicId: startGameData.topicId
                                });
                            } else {
                                $(element.target).addClass('btn-danger');
                                angular.element('#option' + $scope.temp.correctIndex).addClass('btn-success');
                                $scope.myscore = $scope.myscore - 5;
                                $rootScope.socket.emit('confirmAnswer', {
                                    ans: "wrong",
                                    gameId: startGameData.gameId,
                                    topicId: startGameData.topicId
                                });
                            }
                            $scope.isDisabled = true;
                            $rootScope.socket.emit('updateStatus', {
                                gameId: startGameData.gameId,
                                topicId: startGameData.topicId,
                                userId: $rootScope.loggedInUser.userId,
                                playerScore: $scope.myscore,
                                playerName: $rootScope.loggedInUser.name,
                                playerPic: $rootScope.loggedInUser.imageLink
                            });
                        };

                        $scope.question = $scope.questionCounter + ". " +$scope.temp.question;
                        $scope.options = $scope.temp.options;

                        if ($scope.temp.image != "null")
                            $scope.questionImage = temp.image;

                        else {
                            $scope.questionImage = null;
                        }
                        $scope.time = 2;
                    }
                }

            }, 1000);// to create 1s timer
          } else {
            $rootScope.isPlayingAGame = false;
            $scope.question = 'Selected topic does not have any questions in our QuestionBank :(';
          }

        });
        $rootScope.socket.on('takeScore', function(data) {
            $scope.myrank = data.myRank;
            $scope.topperScore = data.topperScore;
            $scope.topperImage = data.topperImage;
            console.log(data.topperImage);
        });
        $rootScope.socket.on('isCorrect', function(data) {
            $scope.correctAnswerers++;
            $scope.unattempted--;
        });
        $rootScope.socket.on('isWrong', function(data) {
            $scope.wrongAnswerers++;
            $scope.unattempted--;
        });
        $rootScope.socket.on('pendingPlayers', function(data) {
            $scope.question = "WAITING FOR " + data.pendingPlayers +" OTHER PLAYER(S)";
        });
        $rootScope.socket.on( 'takeResult', function( resultData ) {
            $rootScope.recentGames[resultData.gameResult.gameId] = {
              error: resultData.error,
              topicId: resultData.gameResult.topicId,
              gameId: resultData.gameResult.gameId,
              gameBoard: resultData.gameResult.gameBoard
            };
            $location.path( '/quizResult/' + resultData.gameResult.gameId );
        });
        $rootScope.socket.on( 'alreadyPlayingTheGame', function( duplicateEntryData ) {
          $scope.question = 'WARNING!!  You are already playing ' + duplicateEntryData.topicId + '. Kindly complete the previous game or play a different one.';
          $rootScope.isPlayingAGame = false;
        });
        $rootScope.socket.on( 'serverMsg', function( msgData ) {
          if (msgData.type == 'LOGOUT') {
            $location.path( '/userProfile' );
          }
        });
      }
    });

function loadNextQuestion( questions, questionNumber, $scope) {
    var optionCounter = 0;
    var obj;
    var options = [];
    while (questions[questionNumber].options[optionCounter]) {
        opt = {
            name: questions[questionNumber].options[optionCounter],
            id: "option" + (optionCounter + 1)
        };
        options.push(opt);
        optionCounter++;
    }
    obj = {
        "options": options,
        "question": questions[questionNumber].question,
        "image": questions[questionNumber].image,
        "correctIndex": questions[questionNumber].correctIndex
    };
    $scope.questionCounter++;
    return obj;
}
