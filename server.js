const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const dns = require("dns");
const url = require("url");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI);

const userSchema = mongoose.Schema({
  name: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);

const exerciseSchema = mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors({ optionSuccessStatus: 200 }));

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", function(req, res) {
  res.send("Welcome to Exercise tracker server");
});

app.post("/api/exercise/new-user", function(req, res) {
  User.findOne({ name: req.body.username })
    .then(result => {
      if (result) {
        res.send("username already taken");
        return false;
      }
      return new User({ name: req.body.username }).save();
    })
    .then(result => {
      return !result
        ? result
        : res.json({
            username: req.body.username,
            _id: result._id
          });
    })
    .catch();
});

app.post("/api/exercise/add", function(req, res) {
  if (!req.body.userId) return res.send("unknown _id");
  if (!req.body.description) return res.send("Path `description` is required.");
  if (!req.body.duration) return res.send("Path `duration` is required.");

  req.body.duration = parseInt(req.body.duration, 10);
  if (!Number.isInteger(req.body.duration))
    return res.send("`duration` is required to be a number.");

  if (req.body.date) req.body.date = new Date(req.body.date);
  if (!req.body.date || isNaN(req.body.date.getTime())) req.body.date = false;

  let username;

  User.findOne({ _id: req.body.userId })
    .then(result => {
      if (!result) {
        res.send("unknown _id");
        return false;
      }

      username = result.name;

      let data = {
        userId: req.body.userId,
        description: req.body.description,
        duration: req.body.duration
      };

      if (req.body.date) data.date = req.body.date;

      return new Exercise(data).save();
    })
    .then(result => {
      return !result
        ? result
        : res.json({
            username: username,
            description: result.description,
            duration: result.duration,
            _id: result.userId,
            date: result.date
          });
    })
    .catch(error => {
      res.send(error.message);
    });
});

app.get("/api/exercise/log", async function(req, res) {
  if (!req.query.userId) return res.send("unknown userId");

  let username;

  User.findOne({ _id: req.query.userId })
    .then(result => {
      if (!result) {
        res.send("unknown userId");
        return false;
      }

      username = result.name;

      let request = {
        userId: req.query.userId
      };

      if (req.query.from)
        request.date = {
          $gte: req.query.from
        };

      if (req.query.to) request.date["$lt"] = req.query.to;

      return Exercise.find(request);
    })
    .then(result => {
      if (result !== false) {
        let send = {
          _id: req.query.userId,
          username: username,
          count: result.length,
          log: []
        };

        for (let i = 0; i < result.length; i++) {
          send.log.push({
            description: result[i].description,
            duration: result[i].duration,
            date: result[i].date
          });
        }

        res.json(send);
      }
    })
    .catch(error => {
      res.send(error.message);
    });
});

var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});