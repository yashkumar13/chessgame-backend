const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("connected");

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
        console.log("White Player ID:", uniquesocket.id);
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
        console.log("Black Player ID:", uniquesocket.id);
    } else {
        uniquesocket.emit("spectatorRole");
        console.log("Spectator ID:", uniquesocket.id);
    }

    uniquesocket.on("disconnect", function () {
        let winnerRole = null;
        if (uniquesocket.id === players.white) {
            delete players.white;
            winnerRole = 'b';
        } else if (uniquesocket.id === players.black) {
            delete players.black;
            winnerRole = 'w';
        }

        if (winnerRole) {
            io.emit("playerDisconnected", winnerRole);
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            console.log("Move Attempt by ID:", uniquesocket.id);
            console.log("Current Turn:", chess.turn());

            if (chess.turn() == 'w' && uniquesocket.id !== players.white) {
                console.log("Not White's Turn");
                return;
            }
            if (chess.turn() == 'b' && uniquesocket.id !== players.black) {
                console.log("Not Black's Turn");
                return;
            }

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                console.log("Invalid move: ", move);
                uniquesocket.emit("invalid move", move);
            }
        } catch (err) {
            console.log(err);
            console.log("Invalid move: ", move);
        }
    });
});

server.listen(3000, function () {
    console.log("listening on 3000");
});

