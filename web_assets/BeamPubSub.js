/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Solace Web Messaging API for JavaScript
 * Publish/Subscribe tutorial - Topic Publisher
 * Demonstrates publishing direct messages to a topic
 */

/*jslint es6 browser devel:true*/
/*global solace*/

var BeamPubSub = function (readTopicName,writeTopicName) {
    'use strict';
    var beamPubSub = {};
    beamPubSub.session = null;
    beamPubSub.readTopicName = readTopicName;
    beamPubSub.writeTopicName = writeTopicName;
    beamPubSub.wordCounts=[];
    beamPubSub.wordCountHTML

    // Logger
    beamPubSub.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
        var logTextArea = document.getElementById('log');
        logTextArea.value += timestamp + line + '\n';
        logTextArea.scrollTop = logTextArea.scrollHeight;
    };


    // Establishes connection to Solace message router
    beamPubSub.connect = function () {
        // extract params
        if (beamPubSub.session !== null) {
            beamPubSub.log('Already connected and ready to publish messages.');
            return;
        }
        var hosturl = 'ws://localhost:80';
        // check for valid protocols
        if (hosturl.lastIndexOf('ws://', 0) !== 0 && hosturl.lastIndexOf('wss://', 0) !== 0 &&
            hosturl.lastIndexOf('http://', 0) !== 0 && hosturl.lastIndexOf('https://', 0) !== 0) {
            beamPubSub.log('Invalid protocol - please use one of ws://, wss://, http://, https://');
            return;
        }

        var username = 'default';
        var pass = 'default';
        var vpn = 'default';

        if (!hosturl || !username || !pass || !vpn) {
            beamPubSub.log('Cannot connect: please specify all the Solace message router properties.');
            return;
        }
        beamPubSub.log('Connecting to Solace message router using url: ' + hosturl);
        beamPubSub.log('Client username: ' + username);
        beamPubSub.log('Solace message router VPN name: ' + vpn);
        // create session
        try {
            beamPubSub.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            beamPubSub.log(error.toString());
        }
        // define session event listeners
        beamPubSub.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            beamPubSub.log('=== Successfully connected and ready to publish messages. ===');
            document.getElementById("WordCount").style.display='block';
            if(!beamPubSub.subscribed){
                          beamPubSub.subscribe();
             }
        });
        beamPubSub.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            beamPubSub.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });

        beamPubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
                    beamPubSub.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
                });
                beamPubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
                    if (beamPubSub.subscribed) {
                        beamPubSub.subscribed = false;
                        beamPubSub.log('Successfully unsubscribed from topic: ' + sessionEvent.correlationKey);
                    } else {
                        beamPubSub.subscribed = true;
                        beamPubSub.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
                        beamPubSub.log('=== Ready to receive messages. ===');
                    }
                });
                // define message event listener
                beamPubSub.session.on(solace.SessionEventCode.MESSAGE, function (message) {
                   beamPubSub.wordCounts.push(JSON.parse(message.getSdtContainer().Gi));
                   document.getElementById('beam-loading').style.visibility='hidden';
                   beamPubSub.wordCountHTML="";
                  _.each(_.groupBy(beamPubSub.wordCounts,'timestamp'),function(groupedValues,key){
                                    beamPubSub.wordCountHTML += "<table class='wordcounttable'><tr><th colspan=2>" + key +"</th></tr><tr><th>Word</th><th>Count</th></tr>"
                                    var that = this;
                  					console.log(key);
                                      _.each(groupedValues,function(value){
                  						beamPubSub.wordCountHTML+="<tr><td align=center>"+value.word+"</td><td align=center>"+value.count+"</td></tr>"
                  					})
                  					beamPubSub.wordCountHTML+="</table>"
                      });

                   document.getElementById('WordCountTables').innerHTML=beamPubSub.wordCountHTML;
                });


        beamPubSub.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            beamPubSub.log('Disconnected.');
            if (beamPubSub.session !== null) {
                beamPubSub.session.dispose();
                beamPubSub.session = null;
            }
        });
        // if secure connection, first load iframe so the browser can provide a client-certificate
        if (hosturl.lastIndexOf('wss://', 0) === 0 || hosturl.lastIndexOf('https://', 0) === 0) {
            var urlNoProto = hosturl.split('/').slice(2).join('/'); // remove protocol prefix
            document.getElementById('iframe').src = 'https://' + urlNoProto + '/crossdomain.xml';
        } else {
            beamPubSub.connectToSolace();   // otherwise proceed
        }
    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    beamPubSub.connectToSolace = function () {
        try {
            beamPubSub.session.connect();
        } catch (error) {
            beamPubSub.log(error.toString());
        }
    };

    // Publishes one message
    beamPubSub.publish = function () {
        if (beamPubSub.session !== null) {



            var messageText = document.getElementById('wordcountText').value.trim();

            if(!_.isEmpty(messageText))
            {
            var message = solace.SolclientFactory.createMessage();
            message.setDestination(solace.SolclientFactory.createTopicDestination(beamPubSub.readTopicName));
            message.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING,messageText));
            message.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
            message.setApplicationMessageId((Math.floor(Math.random() * Math.floor(10000))).toString());
            message.setSenderTimestamp(Date.now());
            try {
                beamPubSub.session.send(message);
                document.getElementById('wordcountText').value='';
                document.getElementById('beam-loading').style.visibility='visible';
                beamPubSub.log('Message published.');
            } catch (error) {
                beamPubSub.log(error.toString());
            }
            }
        }else {
             beamPubSub.log('Cannot publish because not connected to Solace message router.');
        }
    };

     beamPubSub.subscribe = function () {
            if (beamPubSub.session !== null) {
                if (beamPubSub.subscribed) {
                    beamPubSub.log('Already subscribed to "' + beamPubSub.writeTopicName
                        + '" and ready to receive messages.');
                } else {
                    beamPubSub.log('Subscribing to topic: ' + beamPubSub.writeTopicName);
                    try {
                        beamPubSub.session.subscribe(
                            solace.SolclientFactory.createTopicDestination(beamPubSub.writeTopicName),
                            true, // generate confirmation when subscription is added successfully
                            beamPubSub.writeTopicName, // use topic name as correlation key
                            10000 // 10 seconds timeout for this operation
                        );
                    } catch (error) {
                        beamPubSub.log(error.toString());
                    }
                }
            } else {
                beamPubSub.log('Cannot subscribe because not connected to Solace message router.');
            }
        };

    // Gracefully disconnects from Solace message router
    beamPubSub.disconnect = function () {
        beamPubSub.log('Disconnecting from Solace message router...');
        if (beamPubSub.session !== null) {
            try {
                beamPubSub.session.disconnect();
            } catch (error) {
                beamPubSub.log(error.toString());
            }
        } else {
            beamPubSub.log('Not connected to Solace message router.');
        }
    };

    return beamPubSub;
};
