class Game {

    constructor() {
        // Vars
        this.player = null;
        this.room = null;
        this.roomsList = null;

        // Game loop
        this.delta = 0;
        this.fps = 60;
        this.timestep = 1000 / this.fps;
        this.lastFrameTimeMs = 0;

        // Misc
        this.socket = io();
        this.canvasCtx = null;
        this.minChatWidth = 150;
        this.d = { x:0, y:0 };
        this.initialPos = { x:0, y:0 };
        this.mouse = null;
        this.mousedown = false;
        this.disableClick = false; 
        this.resizedown = false;

        this.configureSocket();
        this.getPlayerName();
    }

    joinRoom() {
        if (this.room !== null) this.leaveRoom();
        
        this.createChatPanel(); 
        this.bindChatEvents();
        this.createCanvas();
        this.bindEvents();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    leaveRoom() {
        let app = document.getElementById('app');
        let chat = document.getElementsByClassName('game-chat')[0];
        let chatR = document.getElementsByClassName('game-chatResize')[0];
        let hideB = document.getElementsByClassName('game-hideChatButton')[0];
        let canvas = document.getElementsByClassName('game-canvas')[0];
        app.removeChild(chat);
        app.removeChild(chatR);
        app.removeChild(hideB);
        app.removeChild(canvas);
    }

    startGame(){
        this.createMenu();
    }

    gameLoop(timeStamp) {
        let t = timeStamp - this.lastFrameTimeMs;
        this.delta += t;
        this.lastFrameTimeMs = timeStamp;

        if (this.delta >= this.timestep) {
            let fps = 1000 / t;
            this.fpsSpan.innerHTML = 'fps: ' + parseInt(fps);
            while (this.delta >= this.timestep){
                this.update();
                this.delta -= this.timestep;
            }
            this.draw();
        }
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update() {
        if (this.room !== null){
            this.room.updateLogic();
        }

        this.d = {x:0, y:0};

        // If canvas has been dragged
        if (this.mouse !== null) {
            this.d.x += this.mouse.clientX - this.initialPos.x;
            this.d.y += this.mouse.clientY - this.initialPos.y;
            Grid.move(this.d);
            Grid.createDrawOrder();
            this.initialPos.x = this.mouse.clientX;
            this.initialPos.y = this.mouse.clientY;
            this.mouse = null;
        }
    }

    draw() {
        let ctx = this.canvasCtx;

        // Draw background
        ctx.fillStyle = '#010101';
        ctx.fillRect(0, 0, 
            ctx.canvas.width, ctx.canvas.height);

        // Draw room
        if (this.room !== null) {
            this.room.draw(ctx);
        }
    }

    bindEvents() {
        let canvas = document.getElementsByClassName('game-canvas')[0];
        let body = document.getElementsByTagName('body')[0];
        body.onresize = () => {
            canvas.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth;
            Grid.center(canvas.width,canvas.height);
            Grid.createDrawOrder();
        };

        let r = document.getElementsByClassName('game-chatResize')[0];
        let c = document.getElementsByClassName('game-chat')[0];
        let b = document.getElementsByClassName('game-hideChatButton')[0];
        let chat = document.getElementsByClassName('game-chatMessagesContainer')[0];
        r.onmousedown = (e) => {
            this.resizedown = true;
            this.xIni = e.clientX;
        };
        
        canvas.onmousedown = (e) => {
            this.mousedown = true;
            this.initialPos.x = e.clientX;
            this.initialPos.y = e.clientY;
        };
        
        document.onmousemove = (e) => {
            if (this.mousedown){
                // Prevent from selecting text while dragging
                window.getSelection().removeAllRanges();
                this.mouse = e;
                // Disable click event after dragging
                this.disableClick = true;  
            }
            else if (this.resizedown){
                c.style.transition = 'none';
                b.style.transition = 'none';
                window.getSelection().removeAllRanges();
                let rdx = e.clientX - this.xIni;
                let pc = c.getBoundingClientRect().width + rdx;
                if (pc < this.minChatWidth) pc = this.minChatWidth;
                else if (pc+5 > body.clientWidth) pc = body.clientWidth-5;
                let pr = pc - 5;
                c.style.width = pc + 'px';
                r.style.left = pr + 'px';
                b.style.left = pc + 'px';
                chat.scrollTop = chat.scrollHeight;
                this.xIni = e.clientX;
            }
        };

        document.onmouseup = (e) => {
            this.mousedown = false;
            this.resizedown = false;
        };

        canvas.onclick = (e) => {
            if (!this.disableClick){
                let c = Grid.cellAt(e.clientX, e.clientY);
                if (c!==null) this.socket.emit('click', c);
            }
            this.disableClick = false;
        };

    }

    createCanvas() {
        let app = document.getElementById('app');
        let canvas = document.createElement('canvas');
        canvas.className = 'game-canvas';
        this.canvasCtx = canvas.getContext('2d');
        app.appendChild(canvas);
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
    }

    configureSocket() {
        // Check player name
        this.socket.on('check name', (b) => {
            if (b.res){
                this.player = new Player({ name: b.name, client: true });
                let app = document.getElementById('app');
                app.innerHTML = '';
                this.createInfoSpans();
                Assets.load();
                // Send player name
                this.socket.emit('new player', this.player.name);
            }
            else {
                if (b.errno === 1) 
                    alert('Name must be 4 to 15 characters long.');
                else if (b.errno === 2) 
                    alert('Your name can only contain characters: a-Z, 0-9, '
                        + '- , _ , : and .');
                else if (b.errno === 3)
                    alert('Your name is being used by another player.');
            }
        });

        // Event: Receive chat message
        this.socket.on('chat message', (chatMsg) => {
            this.addChatMessage(chatMsg.player, chatMsg.msg);
        });

        // Event: Receive number of players
        this.socket.on('online players', (num_players) => {
            this.playersSpan.innerHTML = 'online: ' + num_players;
        });

        // Event: Receive rooms list
        this.socket.on('rooms list', (rooms) => {
            this.roomsList = rooms;
            this.createRoomsWindow();
        });

        // Event: Receive room info
        this.socket.on('room info', (room) => {
            // If join room or change room
            if (this.room===null || room.name !== this.room.name) {
                this.room = new Room({client: true});
                this.room.update(room);
                this.player = this.room.players[this.player.name];
                // Update Grid
                Grid.size = this.room.size;
                Grid.center(this.canvasCtx.canvas.width,this.canvasCtx.canvas.height);
                Grid.createDrawOrder();
            }
            else this.room.update(room);
        });

        this.socket.on('player join', (name) => {
            this.addChatInfoMessage(name+' joined the room');
        });

        this.socket.on('player left', (name) => {
            this.addChatInfoMessage(name+' left the room');
        });

    }

    createRoomsWindow() {
        let app = document.getElementById('app');
        let rw = document.createElement('div');
        rw.className = 'game-window';
        let closeB = document.createElement('button');
        closeB.className = 'game-closeButton';
        closeB.innerHTML = 'X';
        closeB.onclick = ()=>{app.removeChild(rw);};
        let ul = document.createElement('ul');
        this.roomsList.forEach((r) => {
            let li = document.createElement('li');
            let s = document.createElement('span');
            s.innerHTML = r.name + ' | Players: ' + r.players;
            let joinB = document.createElement('button');
            joinB.innerHTML = 'Join';
            joinB.onclick = (() => {
                this.socket.emit('join room', r.name);
                this.joinRoom();
                app.removeChild(rw);
            }).bind(r);
            li.appendChild(s);
            li.appendChild(joinB);
            ul.appendChild(li);
        })

        rw.appendChild(closeB);
        rw.appendChild(ul);
        app.appendChild(rw);
    }

    createMenu() {
        let app = document.getElementById('app');
        let menuBar = document.createElement('div');
        menuBar.className = 'game-menu';
        let roomsB = document.createElement('button');
        roomsB.innerHTML = 'Rooms List';
        roomsB.onclick = () => {
            this.socket.emit('rooms list');
        };
        menuBar.appendChild(roomsB);
        app.appendChild(menuBar);
    }

    createInfoSpans() {
        let app = document.getElementById('app');
        this.fpsSpan = document.createElement('span');
        this.fpsSpan.style = 'position: absolute; right: 0; color: #ffffff;' + 
            ' z-index: 1;';
        this.fpsSpan.innerHTML = 'fps: 0';
        app.appendChild(this.fpsSpan);

        this.playersSpan = document.createElement('span');
        this.playersSpan.style = 'position: absolute; right: 0;'+
            ' color: #ffffff; z-index: 1; top: ' + this.fpsSpan.clientHeight + 'px;';
        this.playersSpan.innerHTML = 'online: 0';
        app.appendChild(this.playersSpan);
    }

    createChatPanel() {
        let app = document.getElementById('app');
        let chatC = document.createElement('div');
        chatC.className = 'game-chat';
        let chatMessagesC = document.createElement('div');
        chatMessagesC.className = 'game-chatMessagesContainer';
        let chatInputC = document.createElement('div');
        chatInputC.className = 'game-chatInput';
        this.chatInput = document.createElement('input');
        this.chatInput.type = 'text';
        let chatR = document.createElement('div');
        chatR.className = 'game-chatResize';
        let chatB = document.createElement('button');
        chatB.className = 'game-hideChatButton';
        chatB.innerHTML = 'Hide';

        chatInputC.appendChild(this.chatInput);
        chatC.appendChild(chatMessagesC);
        chatC.appendChild(chatInputC);
        app.appendChild(chatC);
        app.appendChild(chatR);
        app.appendChild(chatB);
    }

    bindChatEvents() {
        this.chatInput.onkeypress = (e) => {
            let msg = this.chatInput.value.trim();
            if (e.keyCode === 13 && msg !== ''){
                this.chatInput.value = '';
                this.socket.emit('chat message', msg);
                this.addChatMessage(this.player.name,msg);
            }
        };

        let b = document.getElementsByClassName('game-hideChatButton')[0];
        let c = document.getElementsByClassName('game-chat')[0];
        let r = document.getElementsByClassName('game-chatResize')[0];
        b.onclick = () => {
            c.style.transition = '0.5s';
            b.style.transition = '0.5s';
            let pc = c.getBoundingClientRect();
            if (pc.left < 0){
                b.innerHTML = 'Hide';
                c.style.left = '0';
                b.style.left = pc.width + 'px';
                r.style.display = 'block';
            }
            else {
                b.innerHTML = 'Show';
                c.style.left = -pc.width + 'px';
                b.style.left = '0';
                r.style.display = 'none';
            }
        };
    }

    addChatMessage(player, msg) {
        let msgC = document.createElement('div');
        msgC.className = 'game-chatMessage';

        let msgSpan = document.createElement('span');
        let nameSpan = document.createElement('span');
        nameSpan.className = 'game-boldText';
        nameSpan.textContent = player + ': ';
        let msgNode = document.createTextNode(msg);

        msgSpan.appendChild(nameSpan);
        msgSpan.appendChild(msgNode);
        msgC.appendChild(msgSpan);
        let chat = document.getElementsByClassName('game-chatMessagesContainer')[0];
        chat.appendChild(msgC);
        chat.scrollTop = chat.scrollHeight;
    }

    addChatInfoMessage(msg) {
        let msgC = document.createElement('div');
        msgC.className = 'game-chatMessage game-chatInfoMessage';

        let msgSpan = document.createElement('span');
        msgSpan.className = 'game-boldText';
        msgSpan.textContent = msg;

        msgC.appendChild(msgSpan);
        let chat = document.getElementsByClassName('game-chatMessagesContainer')[0];
        chat.appendChild(msgC);
        chat.scrollTop = chat.scrollHeight;
    }

    getPlayerName(){
        let app = document.getElementById('app');

        let menu = document.createElement('div');
        menu.className = 'game-centered';

        let nickContainer = document.createElement('div');
        nickContainer.className = 'game-horizontalLayout';

        let nickLabel = document.createElement('div');
        nickLabel.className = 'game-horizontalLayout';

        let nickSpan = document.createElement('span');
        nickSpan.className = 'game-label';
        nickSpan.innerHTML = 'Nickname:';
        
        let nickInputContainer = document.createElement('div');
        nickInputContainer.className = 'game-horizontalLayout';

        let nickInput = document.createElement('input');
        nickInput.type = 'text';

        let buttonC = document.createElement('div');
        buttonC.className = 'game-horizontalLayout';

        let button = document.createElement('button');
        button.className = 'game-horizontalCentered';
        button.innerHTML = 'Play';
        button.onclick = () => {
            let nick = nickInput.value.trim();
            if (nick !== '') {
                this.socket.emit('check name', nick);
            }
        };

        menu.onkeydown = (e) => {
            if (e.keyCode === 13) {
                button.onclick();
            }
        };

        nickLabel.appendChild(nickSpan);
        nickInputContainer.appendChild(nickInput);
        nickContainer.appendChild(nickLabel);
        nickContainer.appendChild(nickInputContainer);
        buttonC.appendChild(button);
        menu.appendChild(nickContainer);
        menu.appendChild(buttonC);
        app.appendChild(menu);

        nickInput.focus();
    }

}