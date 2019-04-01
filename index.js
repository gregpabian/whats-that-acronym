const express = require('express');
const path = require('path');
const request = require('request');

const PORT = process.env.PORT || 5000;
const API_URL = 'http://acronyms.silmaril.ie/cgi-bin/xaa';

const parseString = require('xml2js').parseString;
const app = express();

app.use(express.urlencoded({
  extended: false,
}));

function sendResponse(url, response) {
  const options = {
    method: 'post',
    json: {
      ...response,
      response_type: 'ephemeral',
    },
    url,
  };

  console.log('Sending response', options);

  request(options, (error, response, body) => {
    if (error) {
      console.log('Response error', error);

      return;
    }

    console.log('Response sent');
    console.log(body);
  });
}

// the main API endpoint requested by Slack
app.post('/wat', (req, res) => {
  const acronym = req.body.text;
  const responseUrl = req.body.response_url;

  if (!acronym) {
    res.send('Please enther the acronym you want to look for.');

    return;
  }

  res.send('');

  request.get(`${API_URL}?${acronym}`, (error, response, body) => {
    if (error) {
      console.log('API error', error);

      sendResponse(responseUrl, {
        text: 'Sorry! Can\'t answer your question due to a server error! :(',
      });

      return;
    }

    parseString(body, (error, result) => {
      if (error) {
        console.log('XML Parser error', error);

        sendResponse(responseUrl, {
          text: 'Sorry! Can\'t answer your question due to a server error! :(',
        });

        return;
      }

      let response = {};

      const found = result.acronym.found[0];

      if (found.$.n === '0') {
        response.text = `Sorry, no results found for *${acronym}* :(`;
      } else {
        const text = found.acro
          .map((acro) => `• _${acro.expan[0]}_`)
          .join('\n');

        response.attachments = [{
          pretext: `Found ${found.$.n} result(s) for *${acronym}*:`,
          text,
          mrkdwn_in: [
            'text',
            'pretext',
          ],
        }];
      }

      sendResponse(responseUrl, response);
    });
  });
});

// a helper API endpoint for a simple availability test
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.use((req, res) => {
  res.status(404).send('Sorry, can\'t find that!');
});


app.listen(PORT, () => console.log(`Listening on ${PORT}`));