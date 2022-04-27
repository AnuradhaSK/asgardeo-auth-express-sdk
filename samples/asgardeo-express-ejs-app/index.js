/**
 * Copyright (c) 2022, WSO2 Inc. (http://www.wso2.com) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const {
  AsgardeoExpressAuth,
  isAuthenticated,
} = require("@asgardeo/auth-express");
const cookieParser = require("cookie-parser");
const express = require("express");
const rateLimit = require("express-rate-limit");
const config = require("./config.json");
const url = require("url");

const limiter = rateLimit({
  max: 100,
  windowMs: 1 * 60 * 1000 // 1 minute
});

//Constants
const PORT = 3000;

//Initialize Express App
const app = express();

app.use(cookieParser());
app.use(limiter);

app.set("view engine", "ejs");

app.use("/", express.static("static"));
app.use("/home", express.static("static"));

//Use the Asgardeo Auth Client
app.use(AsgardeoExpressAuth(config));

const dataTemplate = {
  authenticateResponse: null,
  error: false,
  errorMessage: "",
  idToken: null,
  isAuthenticated: true,
  isConfigPresent: Boolean(config && config.clientID && config.clientSecret),
};

//Routes
app.get("/", async (req, res) => {
  let data = { ...dataTemplate };
  data.error = req.query.message ? true : false;
  data.errorMessage =
    req.query.message ||
    "Something went wrong during the authentication process.";
  res.render("landing", data);
});

//If the callback's req object has an asgardeoError, redirect the user to an error page.
// In this example, the langind page is being used to show the errors via URL parameters.
// If you want, you may redirect the users to /login here as well.

const authCallback = (req, res, next) => {
  if (req.asgardeoError) {
    res.redirect(
      url.format({
        pathname: "/",
        query: {
          message: req.asgardeoError
        }
      })
    );
  } else {
    next();
  }
};

//Pass the middleware and the callback function to the route
app.get("/home", isAuthenticated, authCallback, async (req, res) => {
  const data = { ...dataTemplate };

  try {
    data.idToken = data.isAuthenticated
      ? await req.asgardeoAuth.getIDToken(req.cookies.ASGARDEO_SESSION_ID)
      : null;

    data.authenticateResponse = data.isAuthenticated
      ? await req.asgardeoAuth.getBasicUserInfo(req.cookies.ASGARDEO_SESSION_ID)
      : {};

    data.error = req.query.error === "true";

    res.render("home", data);
  } catch (error) {
    res.render("home", { ...data, error: true });
  }
});

//Start the app and listen on PORT 5000
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server Started at PORT ${PORT}`);
});
