class Room {

    constructor(room) {
        this.name = room.name || 'New Room';
        this.size = room.size || 10;
        this.array = room.array || [];
        this.spawn = room.spawn || {x:0, y:0};
        this.spawnDirection = room.spawnDirection || 4;
        this.players = room.players || {};
        this.client = room.client || false;
    }

    update(room) {
        let players = {};
        for (let p in room.players){
            let q;
            if (typeof this.players[p] === 'undefined') {
                q = new Player(room.players[p]);
            }
            else {
                q = this.players[p];
            }
            q.client = true;
            q.update(room.players[p], this);
            q.room = this.name;
            players[p] = q;
        }
        this.players = players;

        this.name = room.name;
        this.size = room.size;
        this.array = room.array;
        this.spawn = room.spawn;
    }

    setPlayersRoom() {
        for (let p in this.players)
            this.players[p].room = this.name;
    }

    cell(x, y){
        let c = this.array[y][x];
        if (c!==null) c.pos = {x: x, y: y};
        return c;
    }

    join(player) {
        this.players[player.name] = player;
        player.room = this.name;
        player.pos = this.spawn;
        player.changeAnim(this.spawnDirection, 'stand');
        // Add to this.array.players
        let tile = this.array[this.spawn.y][this.spawn.x];
        tile.players.push(player.name);
        this.array[this.spawn.y][this.spawn.x] = tile;
    }

    leave(playerName) {
        // Delete from this.array.players
        let p = this.players[playerName];
        let tile = this.array[p.pos.y][p.pos.x];
        let i = tile.players.indexOf(playerName);
        tile.players.splice(i, 1);
        this.array[p.pos.y][p.pos.x] = tile;
        this.players[playerName].reset();
        delete this.players[playerName];
    }

    clear() {
        for(let player in this.players){
            this.leave(player);
        }
    }

    updatePlayerCell(a, b, name) {
        let cell = this.array[a.y][a.x];
        let i = cell.players.indexOf(name);
        cell.players.splice(i, 1);
        cell = this.array[b.y][b.x];
        cell.players.push(name);
    }

    updateLogic(){
        for (let p in this.players)
            this.players[p].updateLogic(this);
    }

    draw(ctx) {
        // Draw room
        let drawO = Grid.getDrawOrdered();
        for (let tile of drawO){
            let cell = this.array[tile.y][tile.x];
            if (cell !== null){
                let img = Assets.getImage(cell.material);
                ctx.drawImage(img, tile.drawPos.x, tile.drawPos.y);
            }
        }
        
        // Draw players of the room
        for (let tile of drawO){
            let cell = this.array[tile.y][tile.x];
            if (cell !== null && cell.players.length > 0){
                for (let player of cell.players){
                    this.players[player].draw(ctx, tile.drawPos);
                }
            }
        }
    }

}

if (typeof module !== 'undefined') {
    module.exports = Room;
}