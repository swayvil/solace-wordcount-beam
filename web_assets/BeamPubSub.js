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

var hosturl = 'ws://localhost:60080';
var username = 'default';
var pass = 'default';
var vpn = 'default';

var BeamPubSub = function (subscriptionFunction) {
    'use strict';
    var beamPubSub = {};
    beamPubSub.session = null;
    beamPubSub.flow = null;
    beamPubSub.writeTopicName = 'SOLACE/BEAM/WRITE';
    beamPubSub.queueName = 'SOLACE/BEAM/READ';
    beamPubSub.queueDestination = new solace.Destination(beamPubSub.queueName, solace.DestinationType.QUEUE);
    beamPubSub.consuming = false;

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

    beamPubSub.log('\n*** Consumer to queue "' + beamPubSub.queueName + '" is ready to connect ***');

    // Establishes connection to Solace message router
    beamPubSub.connect = function () {
        if (beamPubSub.session !== null) {
            beamPubSub.log('Already connected and ready to consume messages.');
            return;
        }
        // check for valid protocols
        if (hosturl.lastIndexOf('ws://', 0) !== 0 && hosturl.lastIndexOf('wss://', 0) !== 0 &&
            hosturl.lastIndexOf('http://', 0) !== 0 && hosturl.lastIndexOf('https://', 0) !== 0) {
            beamPubSub.log('Invalid protocol - please use one of ws://, wss://, http://, https://');
            return;
        }
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
                url: hosturl,
                vpnName: vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            beamPubSub.log(error.toString());
        }
        // define session event listeners
        beamPubSub.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            beamPubSub.log('=== Successfully connected and ready to start the message beamPubSub. ===');
        });
        beamPubSub.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            beamPubSub.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        beamPubSub.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            beamPubSub.log('Disconnected.');
            beamPubSub.consuming = false;
            if (beamPubSub.session !== null) {
                beamPubSub.session.dispose();
                beamPubSub.session = null;
            }
        });
        beamPubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
            beamPubSub.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
        });
        beamPubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
            beamPubSub.subscribed = true;
            beamPubSub.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
            beamPubSub.log('=== Ready to receive messages. ===');

        });

        beamPubSub.connectToSolace();
    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    beamPubSub.connectToSolace = function () {
        try {
            beamPubSub.session.connect();
        } catch (error) {
            beamPubSub.log(error.toString());
        }
    };

    // PubSub on topics
    beamPubSub.subscribe = function () {
        if (beamPubSub.session !== null) {
            if (beamPubSub.subscribed) {
                beamPubSub.log('Already subscribed to "' + beamPubSub.writeTopicName
                    + '" and ready to receive messages.');
            } else {
                beamPubSub.log('Subscribing to topic: ' + beamPubSub.writeTopicName);
                try {

                    beamPubSub.writeTopicName.forEach(function (value) {
                        beamPubSub.session.subscribe(
                            solace.SolclientFactory.createTopicDestination(value),
                            true, // generate confirmation when subscription is added successfully
                            value, // use topic name as correlation key
                            10000 // 10 seconds timeout for this operation
                        )
                    });
                } catch (error) {
                    beamPubSub.log(error.toString());
                }
            }
        } else {
            beamPubSub.log('Cannot subscribe because not connected to Solace message router.');
        }
    };

    // Starts consuming from a queue on Solace message router
    beamPubSub.startConsume = function () {
        if (beamPubSub.session !== null) {
            if (beamPubSub.consuming) {
                beamPubSub.log('Already started consumer for queue "' + beamPubSub.queueName + '" and ready to receive messages.');
            } else {
                beamPubSub.log('Starting consumer for queue: ' + beamPubSub.queueName);
                try {
                    // Create a message consumer
                    beamPubSub.messageConsumer = beamPubSub.session.createMessageConsumer({
                        // solace.MessageConsumerProperties
                        queueDescriptor: { name: beamPubSub.queueName, type: solace.QueueType.QUEUE },
                        acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT, // Enabling Client ack
                    });
                    // Define message consumer event listeners
                    beamPubSub.messageConsumer.on(solace.MessageConsumerEventName.UP, function () {
                        beamPubSub.consuming = true;
                        beamPubSub.log('=== Ready to receive messages. ===');
                    });
                    beamPubSub.messageConsumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, function () {
                        beamPubSub.consuming = false;
                        beamPubSub.log('=== Error: the message consumer could not bind to queue "' + beamPubSub.queueName +
                            '" ===\n   Ensure this queue exists on the message router vpn');
                    });
                    beamPubSub.messageConsumer.on(solace.MessageConsumerEventName.DOWN, function () {
                        beamPubSub.consuming = false;
                        beamPubSub.log('=== The message consumer is now down ===');
                    });
                    beamPubSub.messageConsumer.on(solace.MessageConsumerEventName.DOWN_ERROR, function () {
                        beamPubSub.consuming = false;
                        beamPubSub.log('=== An error happened, the message consumer is down ===');
                    });
                    // Define message received event listener
                    beamPubSub.messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, function (message) {
                        var attachement = message.getBinaryAttachment();
                        subscriptionFunction(attachement.substring(5, attachement.length - 1));
                        // Need to explicitly ack otherwise it will not be deleted from the message router
                        message.acknowledge();
                    });
                    // Connect the message consumer
                    beamPubSub.messageConsumer.connect();
                } catch (error) {
                    beamPubSub.log(error.toString());
                }
            }
        } else {
            beamPubSub.log('Cannot start the queue consumer because not connected to Solace message router.');
        }
    };

    // Disconnects the consumer from queue on Solace message router
    beamPubSub.stopConsume = function () {
        if (beamPubSub.session !== null) {
            if (beamPubSub.consuming) {
                beamPubSub.consuming = false;
                beamPubSub.log('Disconnecting consumption from queue: ' + beamPubSub.queueName);
                try {
                    beamPubSub.messageConsumer.disconnect();
                    beamPubSub.messageConsumer.dispose();
                } catch (error) {
                    beamPubSub.log(error.toString());
                }
            } else {
                beamPubSub.log('Cannot disconnect the consumer because it is not connected to queue "' +
                    beamPubSub.queueName + '"');
            }
        } else {
            beamPubSub.log('Cannot disconnect the consumer because not connected to Solace message router.');
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
