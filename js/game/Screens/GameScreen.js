GameScreen = function(width, height) {
	GameScreen.superclass.constructor.apply(this, arguments);

	//Stats
	this.mDistance = 0;
	this.mCoins = 0;
	
	//Level stuff
	this.mEventTimer = 0;
	this.mEventIndex = 0;
	this.mLastCoin = 0;
	this.mLastObstacle = 0;
	this.mPlaying = true;

	//Coin generation parameters
	this.mCoinFrequency = 0;
	this.mCoinHeight = this.height / 2;
	this.mCoinWaveAmplitude = 0;
	this.mCoinWaveFrequency = 0;
	this.mCoinWaveTimer = 0;

	//Obstacle generation parameters
	this.mObstacleFrequency = 0;
	this.mObstaclePattern = "";
	this.mObstaclePatternIndex = 0;
		
	// Event listeners
	this.addEventListener("update", this.Update.bind(this));
	this.addEventListener("mousedown", this.MouseDown.bind(this));
	this.addEventListener("mouseup", this.MouseUp.bind(this));
};

GameScreen.prototype = {

	setup : function() {
		
		//Setup camera
		TGE.Game.GetInstance().mCameraLocation = new TGE.Point();

		//Setup layers
		this.addChild(this.artLayer = new TGE.DisplayObjectContainer().setup({}));
		this.addChild(this.coinLayer = new TGE.DisplayObjectContainer().setup({}));
		this.addChild(this.obstacleLayer = new TGE.DisplayObjectContainer().setup({}));
		this.addChild(this.UILayer = new TGE.DisplayObjectContainer().setup({}));
		
		//Setup parallax planes
		this.SetupParallaxingPlanes();
		
		//Add distance display & coin display
		this.SetupHud();
		
		//Setup player
		this.addChild(this.mPlayer = this.addChild(new Player().setup({
			x : this.percentageOfWidth(0.5),
			y : this.percentageOfHeight(0.5),
			gameScreen : this
		})));
		
		//Play background music
		TGE.Game.GetInstance().audioManager.Play({ 
			id:'background_music', 
			loop:'1' 
		});
	},

	Update : function(event) {

		if (!this.mPlaying) return;
		
		//Move Camera
		TGE.Game.GetInstance().mCameraLocation.y = 180;
		TGE.Game.GetInstance().mCameraLocation.x = this.mPlayer.worldX + 300;

		// Update the distance and coin displays
		this.distanceDisplay.text = Math.floor(this.mDistance).toString();
		//console.log("tracking   "+this.mDistance);
		this.coinDisplay.text = Math.floor(this.mCoins).toString();
		
		// Read & make level
		this.ReadNextEvent(event.elapsedTime);
		this.SpawnObstacles(event.elapsedTime);
		this.SpawnCoins(event.elapsedTime);
	},
	
	ReadNextEvent : function(elapsedTime) {

		this.mEventTimer += elapsedTime;
		var nextEvent = level[this.mEventIndex];
		if (nextEvent != null) {
			
			// starting a new segment of events?
			if (nextEvent.begin_segment != null) {
				this.mEventTimer = 0;
				this.mEventIndex++;
				this.mCoinFrequency = 0;
				this.mObstacleFrequency = 0;
			}
			
			// setting player's speed?
			else if (nextEvent.player_speed != null) {
				this.mPlayer.SetSpeed(nextEvent.player_speed);
				this.mEventIndex++;
			} 
			
			// setting fall speed?
			else if (nextEvent.fall_speed != null) {
				this.mPlayer.SetFallSpeed(nextEvent.fall_speed);
				this.mEventIndex++;
			}
			
			// setting boost speed?
			else if (nextEvent.boost_speed != null) {
				this.mPlayer.SetBoostSpeed(nextEvent.boost_speed);
				this.mEventIndex++;
			}
			
			// making an event?
			else if (this.mEventTimer >= nextEvent.time) {

				// setting coin frequency?
				if (nextEvent.event == "coin_frequency") {
					this.mCoinFrequency = nextEvent.value;
				}
				
				// setting the coin height?
				else if (nextEvent.event == "coin_height") {
					this.mCoinHeight = this.height * nextEvent.value;
				}
				
				/*// starting a coin sine wave?
				else if (nextEvent.event == "coin_sinewave") {
					this.mCoinWaveAmplitude = nextEvent.amplitude;
					this.mCoinWaveFrequency = nextEvent.amplitude == 0 ? 0 : nextEvent.frequency;
					this.mCoinWaveTimer = 0;
				}
				
				// making a coin box?
				else if (nextEvent.event == "coin_box"){
		            this.GenerateCoinBox(nextEvent.size);
		        }
				*/
				// setting the obstacle frequency?
				else if (nextEvent.event == "obstacle_frequency") {
					this.mObstacleFrequency = nextEvent.value;
					this.mLastObstacle = this.mPlayer.worldX;
				}
				
				// feeding in an obstacle pattern?
				else if (nextEvent.event == "obstacle_pattern") {
					this.mObstaclePattern = nextEvent.value;
					this.mObstaclePatternIndex = 0;
				}
				
				// displaying nothing?
				else if (nextEvent.event == "nothing") {
					this.mCoinFrequency = 0;
					this.mObstacleFrequency = 0;
				}
				
				// ending game?
				else if (nextEvent.event == "game_finished") {
					this.EndGame();

				  //this.mEventIndex = 3;
				  //this.mPlayer.SetSpeed(this.mPlayer.mHorizontalSpeed + 0.01);

				  TGE.Game.GetInstance().audioManager.Play(
				       {
				       	 id: 'levelEnd_sound',
				       	 loop: '0'
				       }
				  )	;
				}

				this.mEventIndex++;
			}
		}
	},

	SpawnObstacles : function(elapsedTime) {
		
		var playerX = this.mPlayer.worldX;
		
		if (this.mObstacleFrequency == 0) {
			this.mLastObstacle = playerX;
		} 
		
		// If it's time for another obstacle
		if ((this.mPlayer.worldX - this.mLastObstacle) > this.mObstacleFrequency) {

			var typeNum = -1;
			var typeChar = "";
			
			// Determine type of obstacle
			if (this.mObstaclePattern.charAt(this.mObstaclePatternIndex) != "X") {
				
				typeNum = this.mObstaclePattern.charCodeAt(this.mObstaclePatternIndex) - 48;
				typeChar = this.mObstaclePattern.charAt(this.mObstaclePatternIndex);
				this.mObstaclePatternIndex++;
			}

			if (typeNum > 0) {
				
				// If its a number, spawn a stationary obstacle
				if (typeNum <= 9) {
					this.obstacleLayer.addChild(new StationaryObstacle().setup({
						worldX : this.mPlayer.worldX + this.percentageOfWidth(1) * 2,
						type : typeNum,
						gameScreen : this
					}));
				} 
				
				// If its a letter, spawn a moving obstacle
				else {
					this.obstacleLayer.addChild(new MovingObstacle().setup({
                        ox : this.mPlayer.worldX + this.percentageOfWidth(1) * 2,
                        type : typeChar,
                        gameScreen : this
                    }));
				}
			}

			this.mLastObstacle = this.mPlayer.worldX;
		}
	},

	SpawnCoins : function(elapsedTime) {

		var x = this.mPlayer.worldX;
		if (this.mCoinFrequency == 0) {
			this.mLastCoin = x;
		} 
		else if ((x - this.mLastCoin) > this.mCoinFrequency) {
			// Create it
			var extra = (x - this.mLastCoin) - this.mCoinFrequency;
			var cx = x - extra;
			var cy = this.mCoinHeight + Math.sin(this.mCoinWaveTimer * this.mCoinWaveFrequency) * this.mCoinWaveAmplitude;
			
			this.coinLayer.addChild(new Coin().setup({
				worldX : cx + this.width * 2,
				worldY : cy,
				gameScreen : this
			}));

			this.mLastCoin = cx;
		}

		this.mCoinWaveTimer += elapsedTime;
	},
	
	GenerateCoinBox: function(size){
        var size = Math.max(2,size);
        

        // Define the origin position
        var ox = this.mPlayer.worldX + this.width * 2;
        var oy = this.mCoinHeight;
    
        var coinSize = 56;
        var cx = ox - (coinSize * size) / 2;
        var cy = oy - (coinSize * size) / 2;    
    
    	// Make the matrix of coins
        for(var y = 0; y < size; y++)
        {
            cx = ox - (coinSize * size) / 2;
            for(var x = 0; x < size; x++)
            {
                this.coinLayer.addChild(new Coin().setup({
                    worldX : cx + this.width * 2,
                    worldY : cy,
                    image: "coin",
                    gameScreen : this
                }));
                    
                cx += coinSize;
            }
            cy += coinSize;
        }
    },

	EndGame : function() {

		// Stop sound
		TGE.Game.GetInstance().audioManager.StopAll();


		this.transitionToWindow({
			windowClass : EndScreen,
			fadeTime : 1.25,
			score : Math.floor(this.GetScore()),
			coins : Math.floor(this.mCoins),
			distance : Math.floor(this.mDistance),
		});
	},
	
	SetupParallaxingPlanes : function() {
		// NOTES:  
		//trackingSpeed:  increasing makes that plane scroll faster on the screen
		//worldY:  is the height of that plane. 0 is the bottom of screen, 450 is the top of screen
		
		//Background image
		this.artLayer.addChild(new TGE.ParallaxPane().setup({
			image : "gamescreen_background",
			worldY: 500,
			trackingSpeed : 0.1,
		}));
		
		//Middle ground plane
		this.artLayer.addChild(new TGE.ParallaxPane().setup({
			image : "gamescreen_middleground",
			worldY : 450,
			trackingSpeed : 0.25 
		}));
		
		//Scrolling ground plane
		this.artLayer.addChild(new TGE.ParallaxPane().setup({
			image : "gamescreen_ground",
			worldY: 12,
			trackingSpeed : 0.6
		}));
	},
	
	SetupHud : function() {
		// NOTES:
		// x and y : the x coordinate of the text or image
		// text : the actual text that will appear on screen
		// scaleX and scaleY : we're shrinking the coin icon so it's smaller than actual coins
		
		
		//Text that displays distance traveled
		this.distanceDisplay = this.UILayer.addChild(new TGE.Text().setup({
			x : 72,
			y : 22,
			text : "0",
			font : "Tahoma 20px",
			color: "white"
		}));
		
		//Feet icon that sits in front of the distance traveled number
	    this.addChild(new TGE.Sprite().setup({
	    	x : 25,
	        y : 22,
	    	image : "distance_ui",
	    	scaleX : 0.5,
	    	scaleY : 0.5
	    }));

		//Text that displays coins collected
		this.coinDisplay = this.UILayer.addChild(new TGE.Text().setup({
			x : 72,
			y : 65,
			text : "0",
			font : "Tahoma 20px",
			color: "white"
		}));
		
		//Coin icon that sits in front of the coins collected number
	    this.addChild(new TGE.Sprite().setup({
	    	x : 25,
	        y : 65,
	    	image : "coin",
	    	scaleX : 0.75,
	    	scaleY : 0.75
	    }));
	    
	},

	PlayerHitCoin : function(params) 
	{
		//Play sound
		TGE.Game.GetInstance().audioManager.Play({
			id : 'hitCoin_sound',
			loop : '0'
		});

		//Increase coins
		this.mCoins += 1;
	},
	
	PlayerHitObstacle : function() 
	{
		//Play sound
		TGE.Game.GetInstance().audioManager.Play({
			id : 'hitObstacle_sound',
			loop : '0'
		});

		//End game
			
	
	},
	
	GetScore : function() {
		if (this.mCoins == 0) return Math.floor(this.mDistance);			

		//Score is distance * coins
		else return Math.floor(((this.mDistance * 5) * this.mCoins));
	},
	
	IncPlayerDistance : function(pixels) { this.mDistance += pixels / 100; },
	GetPlayer : function() { return this.mPlayer; },
	MouseDown : function() { this.mousedown = true; },
	MouseUp : function() { this.mousedown = false; },

}
extend(GameScreen, TGE.Window);
