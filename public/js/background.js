// 动态背景效果（完全复刻 temp 博客）
(function() {
  var canvas = document.createElement('canvas');
  canvas.id = 'universe';
  canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:-1;pointer-events:none';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var W, H, starCount;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    starCount = Math.floor(0.216 * W);
  }
  resize();

  var animFrame = null;
  var stars = [];
  var firstRun = true;

  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function chance(n) { return Math.floor(Math.random() * 1000) + 1 < 10 * n; }

  // ===== 深色模式: 星空效果（复刻 temp） =====
  var GIANT_COLOR = "180,184,240";
  var STAR_COLOR = "226,225,142";
  var COMET_COLOR = "226,225,224";
  var BASE_SPEED = 0.05;

  function Star() { this.reset(); }

  Star.prototype.reset = function() {
    this.giant = chance(3);
    this.comet = !this.giant && !firstRun && chance(10);
    this.x = rand(0, W - 10);
    this.y = rand(0, H);
    this.r = rand(1.1, 2.6);
    // 速度：普通星慢，流星快 50-120 倍
    this.dx = rand(BASE_SPEED, 6 * BASE_SPEED)
      + (this.comet ? rand(50, 120) * BASE_SPEED + 2 * BASE_SPEED : 0);
    this.dy = -rand(BASE_SPEED, 6 * BASE_SPEED)
      - (this.comet ? rand(50, 120) * BASE_SPEED + 2 * BASE_SPEED : 0);
    this.fadingOut = null;
    this.fadingIn = true;
    this.opacity = 0;
    this.opacityThresh = rand(0.2, 1 - 0.4 * (this.comet ? 1 : 0));
    this.doVal = rand(0.0005, 0.002) + (this.comet ? 0.001 : 0);
  };

  Star.prototype.fadeIn = function() {
    if (this.fadingIn) {
      this.fadingIn = !(this.opacity > this.opacityThresh);
      this.opacity += this.doVal;
    }
  };

  Star.prototype.fadeOut = function() {
    if (this.fadingOut) {
      this.fadingOut = !(this.opacity < 0);
      this.opacity -= this.doVal / 2;
      if (this.x > W || this.y < 0) {
        this.fadingOut = false;
        this.reset();
      }
    }
  };

  Star.prototype.draw = function() {
    ctx.beginPath();
    if (this.giant) {
      ctx.fillStyle = "rgba(" + GIANT_COLOR + "," + this.opacity + ")";
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2, false);
    } else if (this.comet) {
      ctx.fillStyle = "rgba(" + COMET_COLOR + "," + this.opacity + ")";
      ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2, false);
      // 流星尾巴
      for (var t = 0; t < 30; t++) {
        ctx.fillStyle = "rgba(" + COMET_COLOR + "," + (this.opacity - this.opacity / 20 * t) + ")";
        ctx.rect(this.x - this.dx / 4 * t, this.y - this.dy / 4 * t - 2, 2, 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "rgba(" + STAR_COLOR + "," + this.opacity + ")";
      ctx.rect(this.x, this.y, this.r, this.r);
    }
    ctx.closePath();
    ctx.fill();
  };

  Star.prototype.move = function() {
    this.x += this.dx;
    this.y += this.dy;
    if (this.fadingOut === false) this.reset();
    if (this.x > W - W / 4 || this.y < 0) {
      this.fadingOut = true;
    }
  };

  function initDark() {
    stars = [];
    for (var i = 0; i < starCount; i++) {
      stars.push(new Star());
      stars[i].reset();
    }
    setTimeout(function() { firstRun = false; }, 50);
    document.addEventListener('click', onDarkClick);
  }

  // 点击产生流星爆发
  var clickComets = [];

  function onDarkClick(e) {
    var cx = e.clientX, cy = e.clientY;
    var count = 8 + Math.floor(Math.random() * 6);
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      var speed = rand(4, 10);
      clickComets.push({
        x: cx, y: cy,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        len: rand(30, 80),
        opacity: 1,
        decay: rand(0.015, 0.03),
        active: true
      });
    }
  }

  function drawClickComets() {
    for (var i = clickComets.length - 1; i >= 0; i--) {
      var c = clickComets[i];
      c.x += c.dx;
      c.y += c.dy;
      c.opacity -= c.decay;
      if (c.opacity <= 0 || c.x < -100 || c.x > W + 100 || c.y < -100 || c.y > H + 100) {
        clickComets.splice(i, 1);
        continue;
      }
      var angle = Math.atan2(c.dy, c.dx);
      var tailX = c.x - Math.cos(angle) * c.len;
      var tailY = c.y - Math.sin(angle) * c.len;
      var grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
      grad.addColorStop(0, "rgba(" + COMET_COLOR + ",0)");
      grad.addColorStop(1, "rgba(" + COMET_COLOR + "," + c.opacity + ")");
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(c.x, c.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.x, c.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255," + c.opacity + ")";
      ctx.fill();
    }
  }

  function animateDark() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      stars[i].move();
      stars[i].fadeIn();
      stars[i].fadeOut();
      stars[i].draw();
    }
    drawClickComets();
    animFrame = requestAnimationFrame(animateDark);
  }

  // ===== 浅色模式: canvas-nest 蜘蛛网效果 =====
  var nestParticles = [];
  var nestMouse = { x: null, y: null, max: 20000 };
  var nestColor = '0,0,0';

  function NestNestParticle() { this.reset(); }

  NestNestParticle.prototype.reset = function() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.xa = 2 * Math.random() - 1;
    this.ya = 2 * Math.random() - 1;
    this.max = 6000;
  };

  function initLight() {
    nestParticles = [];
    var count = 99;
    for (var i = 0; i < count; i++) {
      nestParticles.push(new NestNestParticle());
    }
    canvas.style.opacity = '0.7';
    document.addEventListener('mousemove', onNestMouseMove);
    document.addEventListener('mouseout', onNestMouseOut);
  }

  function onNestMouseMove(e) {
    nestMouse.x = e.clientX;
    nestMouse.y = e.clientY;
  }

  function onNestMouseOut() {
    nestMouse.x = null;
    nestMouse.y = null;
  }

  function animateLight() {
    ctx.clearRect(0, 0, W, H);
    var all = [nestMouse].concat(nestParticles);
    for (var i = nestParticles.length - 1; i >= 0; i--) {
      var o = nestParticles[i];
      o.x += o.xa;
      o.y += o.ya;
      o.xa *= (o.x > W || o.x < 0) ? -1 : 1;
      o.ya *= (o.y > H || o.y < 0) ? -1 : 1;
      ctx.fillRect(o.x - 0.5, o.y - 0.5, 1, 1);
      for (var j = 0; j < all.length; j++) {
        var n = all[j];
        if (o === n || n.x === null || n.y === null) continue;
        var dx = o.x - n.x;
        var dy = o.y - n.y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < n.max) {
          if (n === nestMouse && dist2 >= n.max / 2) {
            o.x -= 0.03 * dx;
            o.y -= 0.03 * dy;
          }
          var ratio = (n.max - dist2) / n.max;
          ctx.beginPath();
          ctx.lineWidth = ratio / 2;
          ctx.strokeStyle = 'rgba(' + nestColor + ',' + (ratio + 0.2) + ')';
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
    }
    animFrame = requestAnimationFrame(animateLight);
  }

  // ===== 切换主题 =====
  function cleanup() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    stars = [];
    clickComets = [];
    nestParticles = [];
    canvas.style.opacity = '1';
    document.removeEventListener('click', onDarkClick);
    document.removeEventListener('mousemove', onNestMouseMove);
    document.removeEventListener('mouseout', onNestMouseOut);
  }

  function switchEffect() {
    cleanup();
    if (isDarkMode()) {
      initDark();
      animateDark();
    } else {
      initLight();
      animateLight();
    }
  }

  window.addEventListener('resize', function() {
    resize();
    switchEffect();
  });

  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === 'data-theme') {
        switchEffect();
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });

  switchEffect();
})();
