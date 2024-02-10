//based on the following tutorial:
//https://unclebigbay.com/build-an-email-application-using-node-js-express-js-with-gmail-and-nodemailer-all-in-one-article#heading-setting-up-google-transporter

// Import express into our project
const express = require("express");

// Import multer for attachment handling/multipart forms
const multer = require("multer");

// Creating an instance of express function
const app = express();

// Import dotenv ##MAKE SURE TO ADD TO GITIGNORE
const dotenv = require("dotenv");

// Configure dotenv
dotenv.config();

// The port we want our project to run on
const PORT = 3005;

// Express should add our path
app.use(express.static("public"));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Nodemailer
const nodemailer = require("nodemailer");

// Googleapis
const { google } = require("googleapis");

// Pull out OAuth2 from googleapis
const OAuth2 = google.auth.OAuth2;

// Multer file storage
const Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./attachments");
    },
    filename: function (req, file, callback) {
        callback(null, `${file.fieldname}_${Date.now()}_${file.originalname}`);
    },
});
  
// Middleware to get a single attachment
const attachmentUpload = multer({
    storage: Storage,
}).single("attachment");
  
// Google nodemail stuff
const createTransporter = async () => {
    // Connect to playground
    const oauth2Client = new OAuth2(
        process.env.OAUTH_CLIENT_ID,
        process.env.OAUTH_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
    );

    // Add the refresh token to Oauth2 connection
    oauth2Client.setCredentials({
        refresh_token: process.env.OAUTH_REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
        if (err) {
            reject("Failed to create access token :( " + err);
        }
        resolve(token);
        });
    });

    // Authenticating & creating method to send
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.SENDER_EMAIL,
            accessToken,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        },
    });

    return transporter;
};


// Root directory -homepage
app.get("/", (req, res) => {
    res.sendFile("/index.html");
});

// Post route to handle retrieving data from HTML form to server
app.post("/send_email", (req, res) => {
    attachmentUpload(req, res, async function (error) {
        if (error) {
            console.log(err);
            return res.send("Error uploading file");
        } else {
            // Pulling out the form data from the request body
            const recipient = req.body.email;
            const subject = req.body.subject;
            const message = req.body.message;
            const attachmentPath = req.file?.path;

            console.log("recipient", recipient);
            console.log("subject", subject);
            console.log("message", message);
            console.log("attachmentPath", attachmentPath);

            let mailOptions = {
                from: process.env.SENDER_EMAIL,
                to: recipient,
                subject: subject,
                text: message,
            };
            if (attachmentPath) {
                // Mail options with attachment
                mailOptions = {
                    from: process.env.SENDER_EMAIL,
                    to: recipient,
                    subject: subject,
                    text: message,
                    attachments: [
                        {
                            path: attachmentPath,
                        },
                    ],
                };
            }
            

            try {
                // Get response from the createTransport
                let emailTransporter = await createTransporter();
        
                // Send email
                emailTransporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        // failed block
                        console.log(error);
                    } else {
                        // Success block
                        console.log("Email sent: " + info.response);
                        return res.redirect("/success.html");
                    }
                });
            } catch (error) {
                return console.log(error);
            }
        //-------------
        }
    });
});
  
// Express allows us to listen to the PORT and trigger a console.log() when you visit the port
app.listen(PORT, () => {
  console.log(`Server is 🏃‍♂️ on port ${PORT}`);
});




    

    