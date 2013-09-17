var direction={LEFT:0,UP:1,RIGHT:2,DOWN:3};

function Game() {

	this.config = {
		gameWidth: 700,
		horizontalPartAmount:50,
		verticalPartAmount:30,
		fps: 100,
		debugMode: false
	};

	this.config.partSize=this.config.gameWidth/this.config.horizontalPartAmount;
	this.config.gameHeight=this.config.partSize*this.config.verticalPartAmount;
	this.width = 0;
	this.height = 0;
	this.gameBounds = {left: 0, top: 0, right: 0, bottom: 0};
	this.intervalId = 0;
	this.score = 0;
	this.stateStack = [];
	this.pressedKeys = {};
	this.gameCanvas =  null;
}

Game.prototype.initialise = function(gameCanvas) {

	this.gameCanvas = gameCanvas;

	this.width = gameCanvas.width;
	this.height = gameCanvas.height;

	this.gameBounds = {
		left: gameCanvas.width / 2 - this.config.gameWidth / 2,
		right: gameCanvas.width / 2 + this.config.gameWidth / 2,
		top: gameCanvas.height / 2 - this.config.gameHeight / 2,
		bottom: gameCanvas.height / 2 + this.config.gameHeight / 2
	};

	this.gameWidth=game.gameBounds.right - game.gameBounds.left;
	this.gameHeight=game.gameBounds.bottom - game.gameBounds.top;
};

Game.prototype.start = function() {

	this.moveToState(new WelcomeState());

	this.config.debugMode = /debug=true/.test(window.location.href);

	var game = this;
	this.intervalId = setInterval(function () { GameLoop(game);}, 1000 / this.config.fps);
};

Game.prototype.currentState = function() {
	return this.stateStack.length > 0 ? this.stateStack[this.stateStack.length - 1] : null;
};

function GameLoop(game) {
	var currentState = game.currentState();
	if(currentState) {

		var dt = 1 / game.config.fps;
		var ctx = this.gameCanvas.getContext("2d");

		if(currentState.update) {
			currentState.update(game, dt);
		} 
		if(currentState.draw) {
			currentState.draw(game, dt, ctx);
		}
	}
}

Game.prototype.moveToState = function(state) {

	if(this.currentState() && this.currentState().leave) {
		this.currentState().leave(game);
		this.stateStack.pop();
	}

	if(state.enter) {
		state.enter(game);
	}

	this.stateStack.pop();
	this.stateStack.push(state);
};

Game.prototype.pushState = function(state) {

	if(state.enter) {
		state.enter(game);
	}

	this.stateStack.push(state);
};

Game.prototype.popState = function() {

	if(this.currentState()) {
		this.currentState().leave(game);
		this.stateStack.pop();
	}
};

Game.prototype.stop = function Stop() {
	clearInterval(this.intervalId);
};

Game.prototype.keyDown = function(keyCode) {
	this.pressedKeys[keyCode] = true;
	if(this.currentState() && this.currentState().keyDown) {
		this.currentState().keyDown(this, keyCode);
	}
};

Game.prototype.keyUp = function(keyCode) {
	delete this.pressedKeys[keyCode];
	if(this.currentState() && this.currentState().keyUp) {
		this.currentState().keyUp(this, keyCode);
	}
};

function WelcomeState() {
	this.drawn=false;
}

WelcomeState.prototype.draw = function(game, dt, ctx) {

if(!this.drawn)
{
	ctx.clearRect(0, 0, game.width, game.height);

	var imageObj = new Image();
	imageObj.src = 'snake.jpg';
	var xPos= game.width/2 -168;
	var yPos=50;
    imageObj.onload = function() {
        ctx.drawImage(imageObj, xPos, yPos);
    };

	ctx.font="30px Verdana";
	ctx.fillStyle = '#000000';
	ctx.textBaseline="center"; 
	ctx.textAlign="center"; 
	ctx.fillText("Snake", game.width / 2, 450);	
	ctx.font="16px Verdana";

	ctx.fillText("Hit the space bar to start the game.", game.width / 2, 500);		
	this.drawn=true;
}
};

WelcomeState.prototype.keyDown = function(game, keyCode) {
	if(keyCode == 32) {
		game.score = 0;
		game.moveToState(new PlayState(game.config));
	}
};

function PlayState(config) {
	this.config = config;
	this.snake = null;
	this.currentPart=null;
	this.currentApple=null;
	this.bombs=[];
	this.updateCount=0;
	this.updateRequestCount=0;
	this.directions=[];
}

PlayState.prototype.enter = function(game) {
	this.snake = new Snake(this.getRandomlyPlacedPart(game));
	this.currentPart=this.getRandomlyPlacedPart(game);
};

PlayState.prototype.keyUp = function(game, keyCode) {
	if(keyCode == 37) {
		this.directions.push(direction.LEFT);		
	}
	if(keyCode == 38) {
		this.directions.push(direction.UP);		
	}
	if(keyCode == 39) {
		this.directions.push(direction.RIGHT);		
	}
	if(keyCode == 40) {
		this.directions.push(direction.DOWN);		
	}
};

PlayState.prototype.getRandomlyPlacedPart = function(game) {
	var mostLeftPosition= game.gameBounds.left +this.config.partSize/2;
	var mostTopPosition= game.gameBounds.top +this.config.partSize/2;		
	var randomX=mostLeftPosition + this.config.partSize*(Math.floor(Math.random()*(this.config.horizontalPartAmount-1)));
	var randomY=mostTopPosition + this.config.partSize*(Math.floor(Math.random()*(this.config.verticalPartAmount-1)));
	
	return {x:randomX,y:randomY,width:this.config.partSize,height:this.config.partSize};
};

PlayState.prototype.getAllObjectsInGame = function() {	
	if(this.currentApple){
		return this.snake.parts.concat(this.bombs,this.currentPart,this.currentApple);
	}
	else{
		return this.snake.parts.concat(this.bombs,this.currentPart);
	}
};

PlayState.prototype.update = function(game, dt) {
	//Indicate that an update was requested
	this.updateRequestCount++;

	//Figure out if we want to performr an update based on the users score
	//The higher the score, the more we want to update => snake will move faster
	var divisibleBy = Math.floor(20-(game.score/2));
	if(this.updateRequestCount%(divisibleBy>1?divisibleBy:1)!==0){
		return;
	}

	//Inidcate we did an actual update
	this.updateCount++;

	//Let the snake update its direction
	this.snake.updateDirection(this.directions);

	//Let the snake update its parts
	this.snake.updateParts();

	//If a part was picked up, we need to generate a new one and add one to the snake
	if(collide(this.snake.head,this.currentPart)){
		do{
			var newPart=this.getRandomlyPlacedPart(game);
		}
		while(collideWithObjects(newPart,this.getAllObjectsInGame()));
		this.currentPart=newPart;

		this.snake.addPart();
		game.score+=1;
	}

	//If there is a apple, check if it should disappear or the snake picked it up
	if(this.currentApple){
		this.currentApple.lifeTime--;
		if(this.currentApple.lifeTime===0){
			this.currentApple=null;
		}
		else{
			//If a apple was picked up, we get 4 points extra
			if(collide(this.snake.head,this.currentApple)){		
				this.currentApple=null;
				game.score+=4;
			}
		}
	}
	else{ //Add a new apple every 90 updates
		if(this.updateCount%90===0){
			do{
				var newApplePart=this.getRandomlyPlacedPart(game);
			}
		while(collideWithObjects(newApplePart,this.getAllObjectsInGame()));
		newApplePart.lifeTime=75;
		this.currentApple=newApplePart;
		}
	}

	//Add bombs at random places every 70 updates
	if(this.updateCount%70===0){
		do{
			var bombPart=this.getRandomlyPlacedPart(game);
		}
		while(collideWithObjects(bombPart,this.getAllObjectsInGame()));
		this.bombs.push(bombPart);
	}


	//Make sure the snake pops up on the other side when it hits a bomb
	if(this.snake.head.x < game.gameBounds.left) {
		this.snake.head.x += game.gameWidth;
	}
	if(this.snake.head.x > game.gameBounds.right) {
		this.snake.head.x -= game.gameWidth;
	}
	if(this.snake.head.y < game.gameBounds.top) {
		this.snake.head.y += game.gameHeight;
	}
	if(this.snake.head.y > game.gameBounds.bottom) {
		this.snake.head.y -= game.gameHeight;
	}

	//Whenever we hit ourselves or one of the bombs, we're dead
	var collidableObjects= this.snake.parts.slice(1,this.snake.parts.length).concat(this.bombs);
	if(collideWithObjects(this.snake.head,collidableObjects)){
		game.moveToState(new GameOverState());
	}
};

PlayState.prototype.drawImageForPart=function(ctx,img,part){
	this.drawImage(ctx,img, part.x, part.y,part.width);
};

PlayState.prototype.drawImage=function(ctx,img,x,y,size){
	ctx.drawImage(img, x-size/2, y-size/2,size,size);    
};

PlayState.prototype.fillSquareForPart=function(ctx,color,part){
	this.fillSquare(ctx,color,part.x,part.y,part.width);
};

PlayState.prototype.fillSquare=function(ctx,color,x,y,size){
	ctx.fillStyle = color;
	ctx.fillRect(x - (size / 2),y - (size / 2), size, size);
	ctx.strokeRect(x - (size / 2),y - (size / 2), size, size);
};

PlayState.prototype.draw = function(game, dt, ctx) {
	//clear area
	ctx.clearRect(0, 0, game.width, game.height);

	//draw boundaries
	ctx.strokeStyle = '#000000';
	ctx.strokeRect(game.gameBounds.left, game.gameBounds.bottom, 
	game.gameBounds.right - game.gameBounds.left, 
	game.gameBounds.top - game.gameBounds.bottom);

	//draw part
	this.fillSquareForPart(ctx,'#37BA2E',this.currentPart);
	
	//draw apple
	if(this.currentApple){

		var appleImage = new Image();
		appleImage.src = 'apple.gif';		
        appleImage.onload = this.drawImageForPart(ctx,appleImage,this.currentApple);
		
		//-->apple lifetime
		var imgXpos = game.gameBounds.left + game.config.partSize/2;
		var imgYpos = game.gameBounds.top - game.config.partSize;
		appleImage = new Image();
		appleImage.src = 'apple.gif';		
        appleImage.onload = this.drawImage(ctx,appleImage,imgXpos,imgYpos,game.config.partSize);		
	
		var appleCounterXpos=imgXpos + game.config.partSize;
		var appleCounterYpos=imgYpos;		
		for(var i=0; i<this.currentApple.lifeTime/4;i++){
			this.fillSquare(ctx,'#FF0000',appleCounterXpos+(i*8), appleCounterYpos, 6);
		}
	}

	//draw bombs
	for(var i=0;i<this.bombs.length;i++){
		var bomb=this.bombs[i];
		var bombImage = new Image();
		bombImage.src = 'bomb.png';		
        bombImage.onload = this.drawImageForPart(ctx,bombImage,bomb);
	}	

	//draw snake
	for(var i=0;i<this.snake.parts.length;i++){
		var snakePart=this.snake.parts[i];
		this.fillSquareForPart(ctx, i===0?'#1D8815':'#37BA2E',snakePart);
	}

	//draw info
	//-->score
	var textYpos = game.gameBounds.top - 12;
	ctx.font="14px Verdana";
	ctx.fillStyle = '#000000';
	var info = "Score: " + game.score;
	ctx.textAlign = "right";
	ctx.fillText(info, game.gameBounds.right, textYpos);

	//-->legend
	textYpos=game.gameBounds.bottom + 12 + game.config.partSize;
	ctx.textAlign = "left";
	var imageYpos=game.gameBounds.bottom + (game.config.partSize*1.5);
	var margin = 5;
	var xPos = game.gameBounds.left+game.config.partSize/2;
		
    this.fillSquare(ctx,'#37BA2E',xPos,imageYpos,game.config.partSize);
	
	xPos+=game.config.partSize;
	xPos+= margin;
	info = "Snake part (+1)";
	ctx.fillStyle = '#000000';
	ctx.fillText(info, xPos , textYpos);

	xPos+=140;
	xPos+= margin;

	imageObj = new Image();
	imageObj.src = 'apple.gif';		
    imageObj.onload = this.drawImage(ctx,imageObj,xPos,imageYpos,game.config.partSize);
	
	xPos+=game.config.partSize;
	xPos+= margin;
	info = "Apple (+4)";
	ctx.fillStyle = '#000000';
	ctx.fillText(info, xPos , textYpos);

	xPos+=100;
	xPos+= margin;
    imageObj = new Image();
	imageObj.src = 'bomb.png';		
    imageObj.onload = this.drawImage(ctx,imageObj, xPos,imageYpos,game.config.partSize);
	
	xPos+=game.config.partSize;
	xPos+= margin;
	info = "Bomb (will kill you)";	
	ctx.fillText(info, xPos , textYpos);
};

function GameOverState() {
}

GameOverState.prototype.draw = function(game, dt, ctx) {

	//clear area
	ctx.clearRect(0, 0, game.width, game.height);

	ctx.font="30px Verdana";
	ctx.fillStyle = '#00000';
	ctx.textBaseline="center"; 
	ctx.textAlign="center"; 
	ctx.fillText("Game Over!", game.width / 2, game.height/2 - 40);	
	ctx.font="16px Verdana";
	ctx.fillText("Your score is: " + game.score, game.width / 2, game.height/2);
	ctx.font="16px Verdana";
	ctx.fillText("Hit the space bar to go back.", game.width / 2, game.height/2 + 40);	
};

GameOverState.prototype.keyDown = function(game, keyCode) {
	if(keyCode == 32) {
		game.score = 0;
		game.moveToState(new WelcomeState());
	}
};

function collideWithObjects(obj, parts){
	for(var i=0;i<parts.length;i++){
		var part=parts[i];
		if(collide(obj, part)){
			return true;
		}
	}
	return false;
}

function collide(a, b) {
    return (a.x===b.x && a.y===b.y);
}

function Snake(part) {
	this.direction=direction.LEFT;
	this.partSize=part.width;
	this.parts= [part];
	this.head=part;
}

Snake.prototype.addPart=function(){
	return this.parts.push({x:this.endPartX,y:this.endPartY,width:this.partSize,height:this.partSize});
};

Snake.prototype.updateDirection=function(directions){

	var wantedDirection = directions.shift();
	//Check what needs to happen to the head of the snake
	if(wantedDirection===direction.LEFT){
		if(this.parts.length===1|| this.direction!==direction.RIGHT) {
			this.direction=direction.LEFT;
		}
	}

	if(wantedDirection===direction.UP){
		if(this.parts.length===1|| this.direction!==direction.DOWN) {
			this.direction=direction.UP;		
		}
	}

	if(wantedDirection===direction.RIGHT){
		if(this.parts.length===1|| this.direction!==direction.LEFT) {		
			this.direction=direction.RIGHT;
		}
	}

	if(wantedDirection===direction.DOWN){
		if(this.parts.length===1|| this.direction!==direction.UP) {
			this.direction=direction.DOWN;
		}
	}
};

Snake.prototype.updateParts=function(){
	//store the x and y position of the end of the snake
	//this is the position where a new part will need to be added
	this.endPartX=this.parts[this.parts.length-1].x;
	this.endPartY=this.parts[this.parts.length-1].y;

	//When the snake is more than 1 part, give every part of the snake the position of the previous part, except the first one
	if(this.parts.length>1){
		for (var i = this.parts.length-1;i>0; i--) {
			this.parts[i].x=this.parts[i-1].x;
			this.parts[i].y=this.parts[i-1].y;
		}
	}

	if(this.direction===direction.LEFT) {		
		this.head.x -= this.head.width;
	}

	if(this.direction===direction.UP) {
		this.head.y -= this.head.height;
	}

	if(this.direction===direction.RIGHT) {
		this.head.x += this.head.width;
	}

	if(this.direction===direction.DOWN) {
		this.head.y += this.head.height;
	}
};

function GameState(updateProc, drawProc, keyDown, keyUp, enter, leave) {
	this.updateProc = updateProc;
	this.drawProc = drawProc;
	this.keyDown = keyDown;
	this.keyUp = keyUp;
	this.enter = enter;
	this.leave = leave;
}