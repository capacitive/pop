// http://paulirish.com/2011/requestanimationframe-for-smart-animating
// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
})();

/**
 * Created by Mark on 2015-06-22.
 */
var pop = {
    _width: 320,
    _height: 480,
    //init function
    _ratio: null,
    _currentWidth: null,
    _currentHeight: null,
    _canvas: null,
    _ctx: null,
    _scale: 1,
    _offset: {top: 0, left: 0},
    _entities: [],
    _nextBubble: 100,
    _score: {
        taps: 0,
        hit: 0,
        escaped: 0,
        escapedSustain: 0,
        accuracy: 0
    },

    init: function(){
        pop._ratio = pop._width / pop._height;
        pop._currentWidth = pop._width;
        pop._currentHeight = pop._height;
        pop._canvas = document.getElementsByTagName('canvas')[0];
        //important, otherwise browser will default to 320x200:
        pop._canvas.width = pop._width;
        pop._canvas.height = pop._height;
        pop._ctx = pop._canvas.getContext('2d');

        pop.ua = navigator.userAgent.toLowerCase();
        pop.android = pop.ua.indexOf('android') > -1;
        pop.ios = pop.ua.indexOf('iphone') > -1 || pop.ua.indexOf('ipad') > -1 ? true : false;

        pop._wave = {
            x: -25,
            y: -40,
            r: 50,
            time: 0,
            offset: 0
        };
        pop._wave.total = Math.ceil(pop._width / pop._wave.r) + 1;

        window.addEventListener('click', function(e){
            e.preventDefault();
            console.log('click!');
            pop.Input.set(e);
        }, false);
        window.addEventListener('touchstart', function (e) {
            e.preventDefault();
            //event obj has array called touches, just get first touch:
            pop.Input.set(e.touches[0]);
        }, false);
        window.addEventListener('touchmove', function (e) {
            //not needed, but prevent default scroll behaviours:
            e.preventDefault();
        }, false);
        window.addEventListener('touchend', function (e) {
            //same as above:
            e.preventDefault();
        }, false);

        pop.resize();

        pop.loop();

        //simple canvas render tests:
        //pop.Draw.clear();
        //pop.Draw.rect(120, 120, 150 ,150);
        //pop.Draw.circle(100, 100, 50, 'rgba(255,0,0,0.5)');
        //pop.Draw.text("Hello World!", 100, 100, 10, '#000');
    },
    update:function(){
        var i, hit,
            checkCollision = false; //only check if tapped (line 87)
        pop._nextBubble -= 1;
        if(pop._nextBubble < 0){
            pop._entities.push(new pop.Bubble());
            pop._nextBubble = (Math.random() * 100) + 100;
        }

        if(pop.Input.tapped){
            pop._entities.push(new pop.Touch(pop.Input.x, pop.Input.y));
            //do not spawn a new touch next frame:
            pop.Input.tapped = false;
            checkCollision = true;
            pop._score.taps += 1;
        }

        //iterate entities and update:
        for(i = 0; i < pop._entities.length;i += 1){
            pop._entities[i].update();

            //check collision:
            if(pop._entities[i].type === 'bubble' && checkCollision){
                hit = pop.collides(pop._entities[i], {x: pop.Input.x, y: pop.Input.y, r: 7});
                if(hit){
                    //spawn an explosion:
                    for(var n = 0; n < 5; n++){
                        pop._entities.push(new pop.Particle(
                            pop._entities[i].x,
                            pop._entities[i].y,
                            2,
                            //random opacity to spice up visual:
                            'rgba(255,255,255,'+Math.random()*1+')'
                        ));
                    }

                    pop._score.hit++;
                }
                pop._entities[i].remove = hit;
            }

            //delete if remove set to true:
            if(pop._entities[i].remove){
                pop._entities.splice(i, 1);
            }
        }

        //update wave offset:
        pop._wave.time = new Date().getTime() * 0.002;
        pop._wave.offset = Math.sin(pop._wave.time * 0.8) * 5;

        pop._score.accuracy = (pop._score.hit / pop._score.taps) * 100;
        //easy way to round floating point numbers:
        pop._score.accuracy = isNaN(pop._score.accuracy) ? 0 : ~~(pop._score.accuracy);
    },
    render: function(){
        var i;
        pop.Draw.rect(0,0,pop._width,pop._height, '#036');

        for(i = 0; i < pop._wave.total; i++){
            pop.Draw.circle(
                pop._wave.x + pop._wave.offset + (i * pop._wave.r),
                pop._wave.y,
                pop._wave.r,
                '#fff'
            );
        }

        for(i = 0; i < pop._entities.length; i += 1){
            pop._entities[i].render();
        }

        pop.Draw.text('Hit: ' + pop._score.hit, 10, 36, 14, '#fff');
        pop.Draw.text('Escapees: ' + pop._score.escaped, 10, 56, 14, '#fff');
        pop.Draw.text('Accuracy: ' + pop._score.accuracy + '%', 10, 76, 14, '#fff');
    },
    loop: function(){
        requestAnimFrame(pop.loop);
        pop.update();
        pop.render();
    },
    resize: function(){
        pop._currentHeight = window.innerHeight;
        //maintain aspect ratio:
        pop._currentWidth = pop._currentHeight * pop._ratio;

        //hide the address bar:
        if(pop.android || pop.ios){
            document.body.style.height = (window.innerHeight + 50) + 'px';
        }

        // set the new canvas style width and height
        // note: our canvas is still 320 x 480, but
        // we're essentially scaling it with CSS:
        pop._canvas.style.width = pop._currentWidth + 'px';
        pop._canvas.style.height = pop._currentHeight + 'px';

        // we use a timeout here because some mobile
        // browsers don't fire if there is not
        // a short delay:
        window.setTimeout(function(){
            window.scrollTo(0, 1);
        }, 1)

        pop._scale = pop._currentWidth / pop._width;
        pop._offset.top = pop._canvas.offsetTop;
        pop._offset.left = pop._canvas.offsetLeft;
    }
};

pop.Touch = function(x, y){
    this.type = 'touch';
    this.x = x;
    this.y = y;
    this.r = 5;
    this.opacity = 1;
    this.fade = 0.05;
    this.remove = false;

    this.update = function(){
        this.opacity -= this.fade;
        this.remove = (this.opacity < 0);
    };

    this.render = function(){
        pop.Draw.circle(this.x, this.y, this.r, 'rgba(255,0,0,'+this.opacity+')' );
    };
};

pop.Bubble = function(){
    this.type = 'bubble';
    this.r = (Math.random() * 20) + 10;
    this.speed = (Math.random() * 3) + 1;
    this.x = (Math.random() * pop._width - this.r);
    this.y = pop._height + (Math.random() * 100) + 100; //ensure off-screen start position
    this.remove = false;

    //amount of side to side motion:
    this.waveSize = 5 + this.r;
    //x pos for sine wave calc:
    this.xConstant = this.x;

    this.update = function(){
        var time = new Date().getTime() * 0.002;

        //move up-screen @ random speed:
        this.y -= this.speed;
        //x coordinate follows a sine wave:
        this.x = this.waveSize * Math.sin(time) + this.xConstant;

        if(this.y < -10){
            pop._score.escaped += 1;//update score
            pop._score.taps += 1;//update accuracy
            this.remove = true;
        }
    };

    this.render = function(){
        pop.Draw.circle(this.x, this.y, this.r, 'rgba(255,255,255,1)');
    }
};

pop.Particle = function(x, y, r, col){
    this.x = x;
    this.y = y;
    this.r = r;
    this.col = col;

    //right or left? - 50% chance:
    this.dir = (Math.random() * 2 > 1) ? 1 : -1;

    //random values so particles don't travel at same speed:
    this.vx = ~~(Math.random() * 4) * this.dir;
    this.vy = ~~(Math.random() * 7);
    this.remove = false;

    this.update = function(){
        //update coords:
        this.x += this.vx;
        this.y += this.vy;

        //increase velocity so particle accelerates off screen:
        this.vx *= 0.99;
        this.vy *= 0.99;

        //adding neg. amount to the y velocity exerts upward pull
        // on the particle, as if drawn to the surface:
        this.vy -= 0.25;

        //off screen?:
        if(this.y < 0){
            this.remove = true;
        }
    };

    this.render = function(){
        pop.Draw.circle(this.x, this.y, this.r, this.col);
    }
};

pop.Input = {
    x: 0,
    y: 0,
    tapped: false,
    set: function(data){
        this.x = (data.pageX - pop._offset.left) / pop._scale;
        this.y = (data.pageY - pop._offset.top) / pop._scale;
        this.tapped = true;
        pop.Draw.circle(this.x, this.y, 10, 'red');
    }
};

pop.Draw = {
    clear: function(){
        pop._ctx.clearRect(0, 0, pop._width, pop._height);
    },
    rect: function(x, y, w, h, col){
        pop._ctx.fillStyle = col;
        pop._ctx.fillRect(x, y, w, h);
    },
    circle: function(x, y, r, col) {
        pop._ctx.fillStyle = col;
        pop._ctx.beginPath();
        pop._ctx.arc(x + 5, y + 5, r, 0, Math.PI * 2, true);
        pop._ctx.closePath();
        pop._ctx.fill();
    },
    text: function(string, x, y, size, col) {
        pop._ctx.font = 'bold '+size+'px Arial';
        pop._ctx.fillStyle = col;
        pop._ctx.fillText(string, x, y);
    }
};

pop.collides = function(a, b){
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.r + b.r;
};

window.addEventListener('load', pop.init, false);
window.addEventListener('resize', pop.resize, false);