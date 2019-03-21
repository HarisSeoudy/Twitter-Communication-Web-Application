// Require all the modules needed
// Express is a fast, minimalist web framework for NodeJS and is used to create the server
const express = require('express');
const app = express();

// Body Parser is a NodeJS body parsing middleware and is used to get the elements from the front-end
const bodyParser = require('body-parser');
// Make the application use the Body Parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sentiment is a AFINN-based sentiment analyser for NodeJS and is used to return positive, neautral or negative tweets
var Sentiment = require('sentiment');
// Create a new Sentiment object
var sentiment = new Sentiment();

// CFenv provides easy access to the Cloud Foundry application environment and is used when deploying the application to the IBM Cloud
var cfenv = require('cfenv');
// Get the application environment data as an object
var appEnv = cfenv.getAppEnv();

// Twit is a Twitter API Client for NodeJS and is used to return tweets matching the users search
var Twit = require('twit');
// Import the "config.js" file
var config = require('./config');
// Create a new Twit object using the Twitter API keys found in the "config.js" file
var T = new Twit(config);

// Give the Express server access to the files in the "public" folder
app.use(express.static('public'));

// My router file has been defined in the controller folder. Export the router folder and add it into the "server.js"
app.use('/', require("./controller/restapi/router"));

// Set the view engine of the Express server to EJS
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

// Set the name of the application
app.set('appName', 'Twitter Communication Web Application');

// Enable this line if running locally
app.set('port', process.env.PORT || 6003);

// Enable this line if deploying to the IBM Cloud
//app.set('port', appEnv.port);


// Homepage
app.get('/', function (req, res) {
	res.render('pages/index', {result: null});
});


// Results page
app.post('/results', function (req, res) { 
	// Get the users input from the search bar using the Body Parser middleware
	var userInput = req.body.userSearch
	// Search parameters to be used in the Twitter search as per the Twitter API
	var searchParams = {
		q: userInput,
		count: 100,
		lang: 'en',
		result_type: 'recent', 
		tweet_mode: 'extended'
  	};
	  
  	// Search for tweets using the Twit module and the search parameters defined above. Once the data has been retrieved, call the "gotData" function
	T.get('search/tweets' , searchParams, gotData);

	// The gotData function is called once the data has been retrieved from the Twiiter search
	function gotData(err, data, response) {
		var tweets = data.statuses;
		// Get the tone that the user selected using the Body Parser middleware
		var tone = req.body.tone;
		// Empty array to store the Tweets after some filtering has been applied
		var result = [];

		// Loop over the Tweets, if they do not include "http" and end with "…" then push them into the "results" array after removing all @usernames, #hashtags and RT's
		for (var i = 0; i < tweets.length; i++) {
			if (!tweets[i].full_text.includes("http") && !tweets[i].full_text.endsWith("…")) {
		 		result.push(tweets[i].full_text.replace(/^RT\s|[@#]\S+\s|[@#]\S+/g,'').replace('&amp;','&').replace('&gt;','>').replace('&lt;','<'));
			} 
		}

		// A function to remove duplicate Tweets from an arrary taken from https://codehandbook.org/how-to-remove-duplicates-from-javascript-array/
		function removeDuplicateUsingFilter(array){
    		let uniqueArray = array.filter(function(elem, index, self) {
        		return index == self.indexOf(elem);
    		});
    		return uniqueArray
		}

		// Empty array to store the Tweets after sentiment analysis has been applied
		var sentimentResults = [];

		// If user selects the "positive" tone, then run this code
		if(tone == "positive"){
			result = removeDuplicateUsingFilter(result);
			// Loop over the Tweets and run the sentiment analyser for each tweet. Get the comparative score returned by the sentiment analyser
			for (var i = 0; i < result.length; i++) {
				toneResult = sentiment.analyze(result[i]);
				sentimentScore = toneResult.comparative;

				// If the comparative score is greater than 0 (meaning its positive) then push the Tweet into the "sentimentResults" array
				if (sentimentScore > 0){
					sentimentResults.push(result[i]);
				}
			}
			result = sentimentResults;
		}

		// If user selects the "neautral" tone, then run this code
		else if(tone == "neautral"){
			result = removeDuplicateUsingFilter(result);
			// Loop over the Tweets and run the sentiment analyser for each tweet. Get the comparative score returned by the sentiment analyser
			for (var i = 0; i < result.length; i++) {
				toneResult = sentiment.analyze(result[i]);
				sentimentScore = toneResult.comparative;

				// If the comparative score is equal to 0 (meaning its neautral) then push the Tweet into the "sentimentResults" array
				if (sentimentScore == 0){
					sentimentResults.push(result[i]);
				}
			}
			result = sentimentResults;
		}

		// If user selects the "negative" tone, then run this code
		else if(tone == "negative"){
			result = removeDuplicateUsingFilter(result);
			// Loop over the Tweets and run the sentiment analyser for each tweet. Get the comparative score returned by the sentiment analyser
			for (var i = 0; i < result.length; i++) {
				toneResult = sentiment.analyze(result[i]);
				sentimentScore = toneResult.comparative;

				// If the comparative score is less than 0 (meaning its negative) then push the Tweet into the "sentimentResults" array
				if (sentimentScore < 0){
					sentimentResults.push(result[i]);
				}
			}
			result = sentimentResults;
		}

		// If the user doesn't select any tone, then run this code
		else {
			result = removeDuplicateUsingFilter(result);
		}

		// Print the contents of "result" to the console (used for testing purposes)
		console.log(result);
		// Render the "results.ejs" page and send the contents of "result" and "userInput" to the front-end
		res.render('pages/results',{result:result,userInput:userInput});
	}
});

// Create a http server using Express
app.listen(app.get('port'), function(){
        console.log(app.get('appName')+' is listening on port: ' + app.get('port'));
    });

