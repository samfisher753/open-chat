class Game {

    constructor() {
        console.log("Initializing Game...");
        this.socket = null;
        this.player = null;
        
        this.getPlayerName();
        
    }

    start() {
        this.createChatPanel();
        this.socket = io();
        this.configureSocket();
        this.bindChatEvents();
    }

    configureSocket() {
        this.socket.on('chat message', (chatMsg) => {
            this.addChatMessage(chatMsg.player, chatMsg.msg);
        });
    }

    createChatPanel() {
        let app = document.getElementById('app');
        let chatC = document.createElement('div');
        chatC.className = 'game-chat';
        let chatInputC = document.createElement('div');
        chatInputC.className = 'game-chatInput';
        this.chatInput = document.createElement('input');

        chatInputC.appendChild(this.chatInput);
        chatC.appendChild(chatInputC);
        app.appendChild(chatC);
    }

    bindChatEvents() {
        this.chatInput.onkeypress = (e) => {
            if (e.keyCode === 13){
                let chatMsg = {
                    player: this.player.getName(),
                    msg: this.chatInput.value
                };
                this.chatInput.value = '';
                this.socket.emit('chat message', chatMsg);
                this.addChatMessage(chatMsg.player,chatMsg.msg);
            }
        };
    }

    addChatMessage(player, msg) {
        let msgC = document.createElement('div');
        msgC.className = 'game-chatMessage';

        let msgSpan = document.createElement('span');
        msgSpan.innerHTML = '<strong>' + player + '</strong>: ' + msg;

        msgC.appendChild(msgSpan);
        let chat = document.getElementsByClassName('game-chat')[0];
        chat.appendChild(msgC);
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

        let buttonC = document.createElement('div');
        buttonC.className = 'game-horizontalLayout';

        let button = document.createElement('button');
        button.className = 'game-horizontalCentered';
        button.innerHTML = 'Play';
        button.onclick = () => {
            this.player = new Player(nickInput.value);
            app.innerHTML = '';
            this.start();
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
    }

}