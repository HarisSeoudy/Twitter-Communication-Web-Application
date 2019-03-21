/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var stt_token;
var isListenting = false;

/**
 * initPage is called by the browser once all files have loaded from the server. 
 * This is specified in the index.html file via the <body onLoad='initPage'> statement
 */
function initPage ()
{
  var methodName = 'initPage';

  // define the variables we need to access the microphone and the speech button on the front-end
  var _mic = $('#microphone'); 
  var readText = $("#readText");

  $.when($.get('/api/speech-to-text/token')).done(
    function(_token) 
    {
      if (_token.success != 'undefined')
        {stt_token = _token.success; console.log(methodName+' stt_token request succeeded.');}
      else
        {stt_token = null; console.log(methodName+' token request failed with: ',_token.failed);}
    }
    );
  
  // When the microphone button is clicked, run this code
  _mic.on("click", function ()
  {
    if (!isListenting){
      // Change the colour of the button to red
      _mic.removeClass("btn-dark");
      _mic.addClass("btn-danger");

      // Get the token from the server
      // The stream is what comes in from the microphone
      stream = WatsonSpeech.SpeechToText.recognizeMicrophone({
        // It needs the token received from the server
        access_token: stt_token,
        // and the outputElement is the html element defined with an id="speech" statement
        outputElement: '#speech' // CSS selector or DOM Element
      });
      // If there's an error in this process, log it to the browser console.
      stream.on('error', function(err) { console.log(err); });

      // Change the state of the button to true, this allows two functions to be called using one button
      isListenting = true;
    }
    // If the microphone is already listenting and it is clicked, then run this code
    else{
      // Change the colour of the button back to "dark"
      _mic.removeClass("btn-danger");
      _mic.addClass("btn-dark");
      console.log("Stopping text-to-speech service...");
      // The if statement is here in case the stop button was clicked either before the stream 
      // was successfully created, or if there was an error in the creation process. 
      // There are two things we need to test for, first, has stream even been defined?
      // We test for that first because the first test to pass, in an OR situation is the 
      // last test made. So, is the stream undefined? If not, is it defined, but null.
      // In either case, we have no stream to stop.
      // The exclamation point at the beginning is a NOT symbol 
      if (!((typeof(stream) == "undefined") || (stream == null))) {stream.stop(); }

      // Change the state of the button back to false
      isListenting = false;
    }
  });

  readText.on("click",  function() 
  {
    console.log("initiating text-to-speech service...");

    if (!((typeof(stream) == "undefined") || (stream == null))) {stream.stop(); }

    var sessionPermissions = JSON.parse(localStorage.getItem('sessionPermissions')) ? 0 : 1;
    // Get the text to be turned into an audio signal
    var textString = $("#speech").val();
    // Select the voice to use 
    var voice = 'en-US_MichaelVoice';
    // Get the audio element from the HTML 5 audio player
    var audio = $("#a_player").get(0);
    // Build the url to call to synthesize the text
    var synthesizeURL = '/api/text-to-speech/synthesize' +
    '?voice=' + voice +
    '&text=' + encodeURIComponent(textString) +
    '&X-WDC-PL-OPT-OUT=' +  sessionPermissions;
    // Attach the synthesize URL to the audio player  
    audio.src = synthesizeURL
    // and pause it in case it's currently running
    audio.pause();
    // Add an event listener and the function to call when the voice comes back
    audio.addEventListener('canplaythrough', onCanplaythrough);
    // Mute the audio player
    audio.muted = true;
    // Set the audio element to play mode, to prepare it for the returning signal
    audio.play();
    // Change the cursor so that there's a visual cue that we're now waiting on the server 
    // to send an audio signal back
    $('body').css('cursor', 'wait');
    $('.readText').css('cursor', 'wait');
    return true;
  });
}

function readResult(txtID)
{
  console.log("initiating text-to-speech service...");
  if (!((typeof(stream) == "undefined") || (stream == null))) {stream.stop(); }

  var sessionPermissions = JSON.parse(localStorage.getItem('sessionPermissions')) ? 0 : 1;
  // Get the text to be turned into an audio signal
  var textString = $(txtID).text();
  // Select the voice to use 
  var voice = 'en-US_MichaelVoice';
  // Get the audio element from the HTML 5 audio player
  var audio = $("#a_player").get(0);
  // Build the url to call to synthesize the text
  var synthesizeURL = '/api/text-to-speech/synthesize' +
  '?voice=' + voice +
  '&text=' + encodeURIComponent(textString) +
  '&X-WDC-PL-OPT-OUT=' +  sessionPermissions;
  // Attach the synthesize URL to the audio player  
  audio.src = synthesizeURL
  // and pause it in case it's currently running
  audio.pause();
  // Add an event listener and the function to call when the voice comes back
  audio.addEventListener('canplaythrough', onCanplaythrough);
  // Mute the audio player
  audio.muted = true;
  // Set the audio element to play mode, to prepare it for the returning signal
  audio.play();
  // Change the cursor so that there's a visual cue that we're now waiting on the server 
  // to send an audio signal back
  $('body').css('cursor', 'wait');
  $('.readText').css('cursor', 'wait');
  return true;
}

/**
 * This function is called each time an audio signal comes back from the server
 */
function onCanplaythrough() 
{
  console.log('onCanplaythrough function called');
  // Get the audio player
  var audio = $('#a_player').get(0);
  // Remove the event listener. 
  // Why am I doing this? 
  // Each time the readText button is clicked, we add an event listener. But we only want one,
  // so once the event listener process kicks off, we remove the current listener. 
  // This lightens the load on the browser and makes the application more robust
  audio.removeEventListener('canplaythrough', onCanplaythrough);
  // Some versions of FireFox have an undetermined bug which causes the audio player to
  // fail if the following try/catch block is missing
  try { audio.currentTime = 0; }
  catch(ex) { // ignore. Firefox just freaks out here for no apparent reason.
            }
  // Do not display the audio controls
  audio.controls = false;
  // Unmute the player
  audio.muted = false;
  // Animate the audio player, so that there is a visual cue on where we are in the 
  // current playback
  $('html, body').animate({scrollTop: $('#a_player').offset().top}, 500);
  // reset the cursor to whatever the user has specified as their default browser cursor. 
  $('body').css('cursor', 'default');
}








