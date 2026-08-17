/* Kreslení. Nemění stav hry, jen ho vykresluje. */

const Render = {

  draw(ctx, g, best){
    const W = g.W, H = g.H;

    /* otřes obrazovky */
    let sx = 0, sy = 0;
    if (g.shake > 0){
      const s = g.shake * g.shake * 9;
      sx = (Math.random() * 2 - 1) * s;
      sy = (Math.random() * 2 - 1) * s;
    }

    ctx.save();
    ctx.translate(sx, sy);

    const cam = g.camY;
    const t = Math.min(1, g.height / 1400);   // jak vysoko jsme — mění barvy

    this.sky(ctx, W, H, t);
    this.farRocks(ctx, g, W, H, cam, t);
    this.backWall(ctx, g, W, H, cam, t);
    this.shafts(ctx, g, W, H, cam, t);
    this.motes(ctx, g, W, H, cam);
    this.water(ctx, g, W, H, cam);
    this.walls(ctx, g, W, H, cam, t);
    this.friendMarks(ctx, g, W, cam);
    if (best > 0) this.bestLine(ctx, g, W, cam, best);
    this.krystaly(ctx, g, cam);
    this.rocks(ctx, g, cam);
    this.particles(ctx, g, cam);
    this.player(ctx, g, cam);
    this.snowfall(ctx, g, W, H, cam);

    ctx.restore();
    this.vignette(ctx, W, H);
    this.zoneTitle(ctx, g, W, H);

    /* probliknutí po ráně */
    if (g.flash > 0){
      ctx.fillStyle = 'rgba(255,255,255,' + (g.flash * 0.30).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  },

  /* ---------- pozadí ---------- */
  sky(ctx, W, H, t){
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    /* čím výš, tím světlejší a teplejší — odměna za šplhání */
    gr.addColorStop(0,    this.mix('#0d1626', '#5b6f9c', t));
    gr.addColorStop(0.45, this.mix('#0a111d', '#2c3a55', t * 0.8));
    gr.addColorStop(1,    this.mix('#05070c', '#0e1524', t * 0.6));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  },

  farRocks(ctx, g, W, H, cam, t){
    for (let layer = 0; layer < 2; layer++){
      const par = layer === 0 ? 0.32 : 0.58;
      const off = cam * par;
      ctx.fillStyle = layer === 0
        ? this.mix('#111a2b', '#33405e', t * 0.7)
        : this.mix('#0c1421', '#232e46', t * 0.7);

      for (let side = 0; side < 2; side++){
        ctx.beginPath();
        const edge = side === 0 ? 0 : W;
        ctx.moveTo(edge, -10);
        const step = 26;
        for (let y = -10; y <= H + 10; y += step){
          const wy = y + off;
          const n = 0.5 + 0.5 * Math.sin(wy * 0.011 + layer * 2.3 + side * 5.1)
                        * Math.sin(wy * 0.004 + layer);
          const depth = (0.10 + 0.12 * n + layer * 0.05) * W;
          ctx.lineTo(side === 0 ? depth : W - depth, y);
        }
        ctx.lineTo(edge, H + 10);
        ctx.closePath();
        ctx.fill();
      }
    }
  },

  /* Zadní stěna uvnitř průrvy — díky ní není mezi stěnami prázdná díra.
     Posouvá se pomaleji než popředí, takže vzniká dojem hloubky. */
  backWall(ctx, g, W, H, cam, t){
    const par = cam * 0.72;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -20);
    for (let y = -20; y <= H + 20; y += 12) ctx.lineTo(World.leftWall(y + cam), y);
    ctx.lineTo(0, H + 20);
    for (let y = H + 20; y >= -20; y -= 12) ctx.lineTo(World.rightWall(y + cam), y);
    ctx.lineTo(W, -20);
    ctx.closePath();
    ctx.clip();
    /* výplň celé průrvy */
    ctx.beginPath();
    ctx.rect(0, -20, W, H + 40);
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    /* záměrně tmavší než přední stěny — hráč musí na první pohled poznat,
       kde je skála a kde díra */
    gr.addColorStop(0, this.mix('#0b1120', '#1b2439', t * 0.6));
    gr.addColorStop(1, this.mix('#05080f', '#0d1422', t * 0.6));
    ctx.fillStyle = gr;
    ctx.fill();

    /* svislé rýhy ve skále */
    for (let i = 0; i < 26; i++){
      const x = (hash1(i * 977) * 1.2 - 0.1) * W;
      const w = 3 + hash1(i * 331) * 16;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.05 + hash1(i * 53) * 0.13).toFixed(3) + ')';
      ctx.fillRect(x, -20, w, H + 40);
    }

    /* vodorovné vrstvy, které ubíhají pomaleji než stěny */
    for (let k = -1; k < H / 46 + 2; k++){
      const wy = Math.floor((par + k * 46) / 46) * 46;
      const sy = wy - par;
      const h = 4 + hash1(wy * 3) * 10;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.05 + hash1(wy) * 0.10).toFixed(3) + ')';
      ctx.fillRect(0, sy, W, h);
    }

    /* pár výklenků, ať to nevypadá jako tapeta */
    for (let k = -1; k < H / 190 + 2; k++){
      const wy = Math.floor((par + k * 190) / 190) * 190;
      if (hash1(wy * 7 + 5) > 0.55) continue;
      const cx = (0.15 + hash1(wy * 11) * 0.7) * W;
      const rw = 18 + hash1(wy * 13) * 40;
      const rh = 14 + hash1(wy * 17) * 26;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.ellipse(cx, wy - par, rw, rh, 0, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  },

  /* světlo shora — čím výš jsi, tím je silnější */
  shafts(ctx, g, W, H, cam, t){
    const power = 0.03 + t * 0.13;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++){
      const x = W * (0.25 + i * 0.25) + Math.sin(g.time * 0.2 + i) * 10;
      const gr = ctx.createLinearGradient(x, 0, x - 40, H * 0.85);
      gr.addColorStop(0, 'rgba(150,190,255,' + (power * (1 - i * 0.2)).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(150,190,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x - 26, 0);
      ctx.lineTo(x + 26, 0);
      ctx.lineTo(x - 34, H * 0.9);
      ctx.lineTo(x - 96, H * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  /* poletující prach — levná, ale hodně znát */
  motes(ctx, g, W, H, cam){
    const par = cam * 0.85;
    ctx.fillStyle = 'rgba(210,230,255,.30)';
    for (let i = 0; i < 34; i++){
      const seedX = hash1(i * 71);
      const seedY = hash1(i * 137);
      const span = H + 120;
      let y = ((seedY * span - par * (0.5 + seedX * 0.5)) % span + span) % span - 60;
      const x = seedX * W + Math.sin(g.time * (0.3 + seedY) + i) * 14;
      const r = 0.7 + seedY * 1.7;
      ctx.globalAlpha = 0.12 + seedX * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /* ---------- stěny ---------- */
  wallPath(ctx, g, H, cam, side, W){
    ctx.beginPath();
    const edge = side < 0 ? -4 : W + 4;
    ctx.moveTo(edge, -20);
    for (let y = -20; y <= H + 20; y += 9){
      const wy = y + cam;
      /* drobná zubatost, ať stěna není hladká */
      const jag = (hash1(Math.floor(wy / 9) * 13 + (side < 0 ? 3 : 77)) - 0.5) * 7;
      ctx.lineTo(World.wallAt(wy, side) + jag * (side < 0 ? -1 : 1), y);
    }
    ctx.lineTo(edge, H + 20);
    ctx.closePath();
  },

  walls(ctx, g, W, H, cam, t){
    for (let s = 0; s < 2; s++){
      const side = s === 0 ? -1 : 1;

      this.wallPath(ctx, g, H, cam, side, W);
      const gr = ctx.createLinearGradient(side < 0 ? 0 : W, 0, side < 0 ? W * 0.55 : W * 0.45, 0);
      gr.addColorStop(0, this.mix('#242c3d', '#49546f', t * 0.55));
      gr.addColorStop(1, this.mix('#3c4760', '#6a769a', t * 0.55));
      ctx.fillStyle = gr;
      ctx.fill();

      /* vrstvy horniny, praskliny a odlesky na hranách */
      ctx.save();
      ctx.clip();
      for (let y = -40; y < H + 40; y += 20){
        const wy = Math.floor((y + cam) / 20) * 20;
        const sy = wy - cam;
        const h = hash1(wy + (side < 0 ? 1 : 2));

        ctx.lineWidth = 1 + h * 1.6;
        ctx.strokeStyle = 'rgba(0,0,0,' + (0.06 + h * 0.14).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(side < 0 ? 0 : W, sy);
        ctx.lineTo(side < 0 ? W : 0, sy + 5 + h * 6);
        ctx.stroke();

        /* světlá hrana pod vrstvou — vypadá to jako odstupňovaná skála */
        if (h > 0.62){
          ctx.strokeStyle = 'rgba(255,255,255,.055)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(side < 0 ? 0 : W, sy + 2);
          ctx.lineTo(side < 0 ? W : 0, sy + 7 + h * 6);
          ctx.stroke();
        }

        /* krátká prasklina napříč */
        if (h < 0.13){
          const x0 = World.wallAt(wy, side) - side * (10 + h * 120);
          ctx.strokeStyle = 'rgba(0,0,0,.22)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x0, sy);
          ctx.lineTo(x0 + side * 26, sy + 22);
          ctx.lineTo(x0 + side * 12, sy + 46);
          ctx.stroke();
        }
      }
      ctx.restore();

      /* světlá hrana u průrvy */
      ctx.beginPath();
      for (let y = -20; y <= H + 20; y += 9){
        const wy = y + cam;
        const jag = (hash1(Math.floor(wy / 9) * 13 + (side < 0 ? 3 : 77)) - 0.5) * 7;
        const x = World.wallAt(wy, side) + jag * (side < 0 ? -1 : 1);
        if (y === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      /* dvojitá hrana: měkká záře a ostrá linka — okraj musí být vidět vždy */
      ctx.strokeStyle = 'rgba(140,190,255,' + (0.16 + t * 0.14).toFixed(3) + ')';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(220,238,255,' + (0.55 + t * 0.25).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();

      this.snow(ctx, g, H, cam, side);
      this.ice(ctx, g, H, cam, side);
      this.spikes(ctx, g, H, cam, side);
    }
  },

  /* Zaváté úseky. Sníh je matný a nadýchaný — schválně jinak než lesklý led,
     ať se ty dva povrchy nepletou. */
  snow(ctx, g, H, cam, side){
    const b0 = Math.floor((cam - 40) / World.BAND);
    const b1 = Math.floor((cam + H + 40) / World.BAND);

    for (let b = b0; b <= b1; b++){
      const band = World.snowBand(b, side);
      if (!band) continue;

      /* nadýchaný okraj — nepravidelná čepice na hraně skály */
      ctx.beginPath();
      const edge = side < 0 ? -4 : g.W + 4;
      ctx.moveTo(edge, band.y0 - cam);
      for (let y = band.y0; y <= band.y1; y += 10){
        const nadych = 4 + hash1(Math.floor(y / 10) * 17 + (side < 0 ? 5 : 9)) * 12;
        ctx.lineTo(World.wallAt(y, side) - side * nadych, y - cam);
      }
      ctx.lineTo(edge, band.y1 - cam);
      ctx.closePath();

      const gr = ctx.createLinearGradient(side < 0 ? 0 : g.W, 0, side < 0 ? g.W * 0.35 : g.W * 0.65, 0);
      gr.addColorStop(0, 'rgba(225,235,248,.30)');
      gr.addColorStop(1, 'rgba(248,252,255,.88)');
      ctx.fillStyle = gr;
      ctx.fill();

      /* jemné stíny v závěji, ať to není bílá placka */
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(150,175,205,.30)';
      for (let y = band.y0; y < band.y1; y += 19){
        const h = hash1(y * 3 + 1);
        ctx.beginPath();
        ctx.ellipse(World.wallAt(y, side) - side * (10 + h * 26), y - cam, 16 + h * 16, 5, 0, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  /* Sněžení v popředí — čistě ozdoba, hráči se nemůže nic stát.
     Proto malé, rozmazané, pomalé a bez obrysu: nesmí to jít splést
     se sněhovou koulí, která je velká, ostrá a padá rovnou dolů. */
  snowfall(ctx, g, W, H, cam){
    /* sněžit začne o kus dřív, než přijde zavátá stěna — jako předzvěst */
    const sila = Math.max(0, Math.min(1, (g.height - (World.SNOW_FROM_M - 30)) / 45));
    if (sila <= 0) return;

    const pocet = Math.floor(70 * sila);
    for (let i = 0; i < pocet; i++){
      const sx = hash1(i * 313);
      const sy = hash1(i * 577);
      const rychlost = 0.35 + sy * 0.5;
      const span = H + 140;
      let y = ((sy * span + cam * -rychlost) % span + span) % span - 70;
      const x = (sx * W + Math.sin(g.time * (0.4 + sx) + i) * 22 + W) % W;
      const r = 1 + sy * 1.6;

      ctx.globalAlpha = (0.18 + sx * 0.30) * sila;
      ctx.fillStyle = '#eaf4ff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /* název nové části hory — krátce probliknе a zmizí */
  zoneTitle(ctx, g, W, H){
    if (g.zonaCas <= 0 || !g.zonaText) return;
    const t = g.zonaCas / 2.6;
    const a = t > 0.75 ? (1 - t) * 4 : Math.min(1, t * 1.6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.shadowColor = 'rgba(120,190,255,.9)';
    ctx.shadowBlur = 24;
    ctx.fillText(g.zonaText, W / 2, H * 0.30);
    ctx.restore();
  },

  /* namrzlé úseky stěny — musí být poznat na první pohled, ne až po pádu */
  ice(ctx, g, H, cam, side){
    const b0 = Math.floor((cam - 40) / World.BAND);
    const b1 = Math.floor((cam + H + 40) / World.BAND);

    for (let b = b0; b <= b1; b++){
      const band = World.iceBand(b, side);
      if (!band) continue;

      ctx.save();
      ctx.beginPath();
      const edge = side < 0 ? -4 : g.W + 4;
      ctx.moveTo(edge, band.y0 - cam);
      for (let y = band.y0; y <= band.y1; y += 8) ctx.lineTo(World.wallAt(y, side), y - cam);
      ctx.lineTo(edge, band.y1 - cam);
      ctx.closePath();

      const gr = ctx.createLinearGradient(side < 0 ? 0 : g.W, 0, side < 0 ? g.W * 0.4 : g.W * 0.6, 0);
      gr.addColorStop(0, 'rgba(150,215,255,.14)');
      gr.addColorStop(1, 'rgba(205,240,255,.60)');
      ctx.fillStyle = gr;
      ctx.fill();

      /* lesklé pruhy, ať to vypadá kluzce */
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      for (let y = band.y0; y < band.y1; y += 26){
        const w = 10 + hash1(y) * 26;
        ctx.beginPath();
        ctx.moveTo(World.wallAt(y, side) - side * 2, y - cam);
        ctx.lineTo(World.wallAt(y, side) - side * w, y - cam + 16);
        ctx.stroke();
      }
      ctx.restore();

      /* ostrá modrá hrana */
      ctx.beginPath();
      for (let y = band.y0; y <= band.y1; y += 8){
        const x = World.wallAt(y, side);
        if (y === band.y0) ctx.moveTo(x, y - cam); else ctx.lineTo(x, y - cam);
      }
      ctx.strokeStyle = 'rgba(235,252,255,.95)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  },

  /* Z čeho jsou trny v daném pásmu. Čistě vzhled — chovají se všude stejně.
     Dole kámen, v ledové části obojí, ve sněhu už jen led. */
  materialTrnu(band){
    const y = band * World.BAND;
    if (y <= World.snowStartY()) return 'led';
    if (y <= World.iceStartY())  return hash1(band * 8191 + World.seedNum) < 0.5 ? 'led' : 'kamen';
    return 'kamen';
  },

  spikes(ctx, g, H, cam, side){
    const b0 = Math.floor((cam - 40) / World.BAND);
    const b1 = Math.floor((cam + H + 40) / World.BAND);

    for (let b = b0; b <= b1; b++){
      const band = World.spikeBand(b, side);
      if (!band) continue;

      const material = this.materialTrnu(b);
      const step = 17;

      /* stín pod trny, ať nesplývají se stěnou */
      ctx.beginPath();
      for (let y = band.y0; y < band.y1; y += step){
        ctx.moveTo(World.wallAt(y, side) - side * 1, y - cam + 2);
        ctx.lineTo(World.wallAt(y + step * 0.5, side) - side * 16, y + step * 0.5 - cam + 3);
        ctx.lineTo(World.wallAt(y + step, side) - side * 1, y + step - cam + 2);
        ctx.closePath();
      }
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fill();

      /* samotné trny */
      ctx.beginPath();
      for (let y = band.y0; y < band.y1; y += step){
        /* nepravidelná délka, ať to nevypadá jako pila ze škatulky */
        const h = 12 + hash1(Math.floor(y) * 7 + (side < 0 ? 3 : 91)) * 7;
        ctx.moveTo(World.wallAt(y, side) - side * 1, y - cam);
        ctx.lineTo(World.wallAt(y + step * 0.5, side) - side * h, y + step * 0.5 - cam);
        ctx.lineTo(World.wallAt(y + step, side) - side * 1, y + step - cam);
        ctx.closePath();
      }

      const stred = World.wallAt(band.y0, side);
      const gr = ctx.createLinearGradient(stred, 0, stred - side * 20, 0);
      if (material === 'led'){
        gr.addColorStop(0, 'rgba(175,225,250,.95)');
        gr.addColorStop(0.55, 'rgba(240,252,255,.98)');
        gr.addColorStop(1, 'rgba(140,200,235,.95)');
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,160,205,.9)';
      } else {
        gr.addColorStop(0, '#7f7a6e');
        gr.addColorStop(0.5, '#9c968a');
        gr.addColorStop(1, '#575349');
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,25,20,.85)';
      }
      ctx.lineWidth = 1.6;
      ctx.stroke();

      /* světlo na hraně každého hrotu */
      ctx.beginPath();
      for (let y = band.y0; y < band.y1; y += step){
        const h = 12 + hash1(Math.floor(y) * 7 + (side < 0 ? 3 : 91)) * 7;
        ctx.moveTo(World.wallAt(y, side) - side * 1, y - cam);
        ctx.lineTo(World.wallAt(y + step * 0.5, side) - side * h, y + step * 0.5 - cam);
      }
      ctx.strokeStyle = material === 'led' ? 'rgba(255,255,255,.95)' : 'rgba(215,205,185,.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  },

  /* ---------- voda ---------- */
  water(ctx, g, W, H, cam){
    const surf = g.waterY - cam;
    if (surf > H + 30) return;

    const top = Math.max(-20, surf);
    const gr = ctx.createLinearGradient(0, top, 0, H);
    gr.addColorStop(0, 'rgba(60,170,205,.55)');
    gr.addColorStop(0.3, 'rgba(24,90,130,.80)');
    gr.addColorStop(1, 'rgba(8,32,52,.95)');
    ctx.fillStyle = gr;

    ctx.beginPath();
    ctx.moveTo(-4, H + 20);
    for (let x = -4; x <= W + 4; x += 8){
      const w = Math.sin(x * 0.045 + g.time * 3.1) * 4
              + Math.sin(x * 0.017 - g.time * 1.7) * 3;
      ctx.lineTo(x, surf + w);
    }
    ctx.lineTo(W + 4, H + 20);
    ctx.closePath();
    ctx.fill();

    /* pěna na hladině */
    ctx.beginPath();
    for (let x = -4; x <= W + 4; x += 8){
      const w = Math.sin(x * 0.045 + g.time * 3.1) * 4
              + Math.sin(x * 0.017 - g.time * 1.7) * 3;
      if (x === -4) ctx.moveTo(x, surf + w); else ctx.lineTo(x, surf + w);
    }
    ctx.strokeStyle = 'rgba(190,240,255,.75)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },

  /* Kam dnes došli kamarádi. Vidíš jejich čáru nad sebou a víš přesně,
     kolik ti zbývá — to táhne mnohem víc než tabulka po skončení běhu. */
  friendMarks(ctx, g, W, cam){
    const znacky = g.znacky || [];
    if (!znacky.length) return;

    ctx.save();
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';

    for (const z of znacky){
      const y = -z.metry * P.METER - cam;
      if (y < -20 || y > g.H + 20) continue;

      ctx.setLineDash([5, 9]);
      ctx.strokeStyle = 'rgba(150,200,255,.40)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.setLineDash([]);

      const popis = z.jmeno + '  ' + z.metry + ' m';
      const sirka = ctx.measureText(popis).width;
      ctx.fillStyle = 'rgba(10,16,26,.72)';
      ctx.fillRect(8, y - 15, sirka + 14, 15);
      ctx.fillStyle = 'rgba(190,222,255,.92)';
      ctx.fillText(popis, 15, y - 4);
    }
    ctx.restore();
  },

  /* ---------- značka rekordu ---------- */
  bestLine(ctx, g, W, cam, best){
    const y = -best * P.METER - cam;
    if (y < -10 || y > g.H + 10) return;
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(255,220,140,.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,220,140,.8)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('your record  ' + best + ' m', W / 2, y - 6);
    ctx.restore();
  },

  /* Krystaly. Ve vzduchu se pomalu vznášejí a otáčejí, ve stěně jsou
     zapuštěné a jen se lesknou — ať je hned poznat, co je kde. */
  KRYSTAL_BARVY: {
    kremen: { jadro:'#ffe9ab', hrana:'#c9962f', zar:'rgba(255,210,120,' },
    ledovy: { jadro:'#dcf5ff', hrana:'#5aa8cf', zar:'rgba(150,225,255,' },
    vzacny: { jadro:'#f0dcff', hrana:'#9a5fd0', zar:'rgba(210,160,255,' },
  },

  krystaly(ctx, g, cam){
    const seznam = World.krystalyKolem(cam - 60, cam + g.H + 60);

    for (const k of seznam){
      if (g.sebrano && g.sebrano[k.id]) continue;
      const y = k.y - cam;
      if (y < -40 || y > g.H + 40) continue;

      const barvy = this.KRYSTAL_BARVY[k.druh] || this.KRYSTAL_BARVY.kremen;
      const puls = 0.75 + 0.25 * Math.sin(g.time * 2.6 + k.y * 0.03);
      const vzn = k.vzduch ? Math.sin(g.time * 1.8 + k.y * 0.02) * 4 : 0;
      const r = (k.vzduch ? 9 : 8) + k.hodnota;

      ctx.save();
      ctx.translate(k.x, y + vzn);

      /* záře kolem */
      const zar = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 3);
      zar.addColorStop(0, barvy.zar + (0.5 * puls).toFixed(2) + ')');
      zar.addColorStop(1, barvy.zar + '0)');
      ctx.fillStyle = zar;
      ctx.fillRect(-r * 3, -r * 3, r * 6, r * 6);

      if (k.vzduch) ctx.rotate(g.time * 0.8 + k.y);

      /* broušený kámen: špička nahoře i dole, dvě boční plochy */
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.5);
      ctx.lineTo(r * 0.85, -r * 0.2);
      ctx.lineTo(0, r * 1.5);
      ctx.lineTo(-r * 0.85, -r * 0.2);
      ctx.closePath();
      ctx.fillStyle = barvy.jadro;
      ctx.fill();
      ctx.strokeStyle = barvy.hrana;
      ctx.lineWidth = 2;
      ctx.stroke();

      /* vnitřní hrana, ať to vypadá broušené */
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.5);
      ctx.lineTo(0, r * 1.5);
      ctx.moveTo(-r * 0.85, -r * 0.2);
      ctx.lineTo(r * 0.85, -r * 0.2);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  },

  /* ---------- padající kameny ---------- */
  rocks(ctx, g, cam){
    for (const r of g.rocks){
      const y = r.y - cam;
      if (y < -60 || y > g.H + 60) continue;

      /* Sněhová koule: velká, ostře ohraničená, se stínem a ocasem.
         Vedle drobných vloček na pozadí musí být na první pohled jasné,
         že tohle je věc, která tě srazí. */
      if (r.typ === 'koule'){
        ctx.save();
        ctx.translate(r.x, y);

        /* ocas za koulí — musí jen naznačit rychlost, ne dělat sněhuláka */
        for (let k = 1; k <= 3; k++){
          ctx.fillStyle = 'rgba(226,240,255,' + (0.13 - k * 0.035).toFixed(3) + ')';
          ctx.beginPath();
          ctx.ellipse(0, -k * r.r * 0.55, r.r * (0.92 - k * 0.20), r.r * (1.1 - k * 0.22), 0, 0, 6.283);
          ctx.fill();
        }

        const kg = ctx.createRadialGradient(-r.r * 0.35, -r.r * 0.4, r.r * 0.2, 0, 0, r.r);
        kg.addColorStop(0, '#ffffff');
        kg.addColorStop(0.65, '#e8f1fb');
        kg.addColorStop(1, '#a9bed6');
        ctx.beginPath();
        ctx.arc(0, 0, r.r, 0, 6.283);
        ctx.fillStyle = kg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,85,120,.85)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        /* hrudky, ať to není jen kolečko */
        ctx.fillStyle = 'rgba(140,165,195,.45)';
        for (let k = 0; k < 3; k++){
          const a = hash1(k * 91 + r.shape) * 6.283;
          const d = r.r * (0.25 + hash1(k * 37) * 0.4);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r.r * 0.16, 0, 6.283);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      if (r.typ === 'rampouch'){
        ctx.save();
        ctx.translate(r.x, y);
        ctx.beginPath();
        ctx.moveTo(-r.r, -r.dl * 0.5);
        ctx.lineTo(r.r, -r.dl * 0.5);
        ctx.lineTo(0, r.dl * 0.6);
        ctx.closePath();
        const ig = ctx.createLinearGradient(-r.r, 0, r.r, 0);
        ig.addColorStop(0, 'rgba(190,235,255,.95)');
        ig.addColorStop(0.5, 'rgba(255,255,255,.98)');
        ig.addColorStop(1, 'rgba(120,190,235,.95)');
        ctx.fillStyle = ig;
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,140,190,.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.translate(r.x, y);
      ctx.rotate(r.rot);
      ctx.beginPath();
      const n = 6 + r.shape;
      for (let i = 0; i < n; i++){
        const a = (i / n) * Math.PI * 2;
        const rr = r.r * (0.78 + hash1(i * 7 + r.shape * 31) * 0.42);
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#6e6559';
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,18,15,.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
      /* odlesk */
      ctx.beginPath();
      ctx.arc(-r.r * 0.25, -r.r * 0.3, r.r * 0.3, 0, 6.283);
      ctx.fillStyle = 'rgba(255,240,215,.16)';
      ctx.fill();
      ctx.restore();
    }
  },

  particles(ctx, g, cam){
    for (const q of g.parts){
      const a = Math.max(0, q.life / q.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y - cam, q.r * (0.4 + a * 0.8), 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /* ---------- postava ---------- */
  player(ctx, g, cam, skinId){
    const p = g.player;
    const skin = (typeof Skiny !== 'undefined') ? Skiny.najdi(skinId || Skiny.vybrany()) : null;
    const barvy = skin || { telo:['#f4efe4','#c3b49b'], hlava:'#fdf7ec', sala:'#e0748a' };
    const y = p.y - cam;
    const sq = p.squash;
    const scaleX = 1 + sq * 0.28;
    const scaleY = 1 - sq * 0.24;

    ctx.save();
    ctx.translate(p.x, y);

    /* šála letí proti pohybu */
    const vlen = Math.hypot(p.vx, p.vy);
    const dx = vlen > 20 ? -p.vx / vlen : p.side * 0.6;
    const dy = vlen > 20 ? -p.vy / vlen : -0.4;
    ctx.strokeStyle = barvy.sala;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(dx * 11, dy * 11 - 2, dx * 21 + Math.sin(g.time * 9) * 3, dy * 21);
    ctx.stroke();

    ctx.scale(scaleX, scaleY);

    /* ruka ke stěně, když visíš */
    if (p.state === 'cling'){
      ctx.strokeStyle = '#d8c9ae';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(p.side * (P.R - 1), -P.R * 0.5);
      ctx.stroke();
    }

    /* tělo */
    const bodyGr = ctx.createLinearGradient(0, -P.R, 0, P.R);
    bodyGr.addColorStop(0, barvy.telo[0]);
    bodyGr.addColorStop(1, barvy.telo[1]);
    ctx.beginPath();
    ctx.ellipse(0, 1, P.R * 0.78, P.R * 0.92, 0, 0, 6.283);
    ctx.fillStyle = bodyGr;
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,30,40,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* hlava */
    const faceX = p.face * 2.5;
    ctx.beginPath();
    ctx.arc(faceX, -P.R * 0.72, P.R * 0.46, 0, 6.283);
    ctx.fillStyle = barvy.hlava;
    ctx.fill();
    ctx.stroke();

    /* ozdoby podle skinu — uši, čepice, přilba... */
    if (skin) this.skinOzdoby(ctx, skin.id, faceX);

    /* nohy */
    ctx.strokeStyle = '#3d4657';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    const kick = p.state === 'air' ? Math.sin(g.time * 14) * 3 : 0;
    ctx.moveTo(-3, P.R * 0.75); ctx.lineTo(-4 - kick, P.R * 1.25);
    ctx.moveTo(3, P.R * 0.75);  ctx.lineTo(4 + kick, P.R * 1.25);
    ctx.stroke();

    /* omráčení */
    if (p.stun > 0){
      ctx.strokeStyle = 'rgba(255,210,120,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -P.R * 1.5, 5 + Math.sin(g.time * 20) * 1.5, 0, 6.283);
      ctx.stroke();
    }

    ctx.restore();
  },

  /* doplňky nad hlavou/na hlavě podle vybraného skinu */
  skinOzdoby(ctx, id, faceX){
    const R = P.R;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(25,30,40,.55)';

    if (id === 'liska'){                          // liška — špičaté uši, bílý čenich
      ctx.fillStyle = '#e8834a';
      ctx.beginPath(); ctx.moveTo(faceX - 10, -R * 0.98); ctx.lineTo(faceX - 15, -R * 1.42); ctx.lineTo(faceX - 3, -R * 1.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(faceX + 10, -R * 0.98); ctx.lineTo(faceX + 15, -R * 1.42); ctx.lineTo(faceX + 3, -R * 1.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fdf7ec';
      ctx.beginPath(); ctx.ellipse(faceX + 3, -R * 0.58, R * 0.20, R * 0.15, 0, 0, 6.283); ctx.fill();

    } else if (id === 'tucnak'){                  // tučňák — oranžový zobák, bílé bříško
      ctx.fillStyle = '#e0a83d';
      ctx.beginPath(); ctx.moveTo(faceX - 2, -R * 0.66); ctx.lineTo(faceX + 9, -R * 0.60); ctx.lineTo(faceX - 2, -R * 0.50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fdf7ec';
      ctx.beginPath(); ctx.ellipse(0, R * 0.35, R * 0.42, R * 0.55, 0, 0, 6.283); ctx.fill();

    } else if (id === 'policajt'){                // policista — čepice s kšiltem a odznakem
      ctx.fillStyle = '#1c355c';
      ctx.beginPath(); ctx.arc(faceX, -R * 1.02, R * 0.50, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(faceX, -R * 1.02, R * 0.52, R * 0.14, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd070';
      ctx.beginPath(); ctx.arc(faceX, -R * 1.04, R * 0.09, 0, 6.283); ctx.fill();

    } else if (id === 'panda'){                   // panda — černé uši a náplasti přes oči
      ctx.fillStyle = '#232830';
      ctx.beginPath(); ctx.arc(faceX - 13, -R * 1.14, R * 0.32, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(faceX + 13, -R * 1.14, R * 0.32, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(faceX - 9, -R * 0.72, R * 0.17, R * 0.22, -0.3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(faceX + 9, -R * 0.72, R * 0.17, R * 0.22, 0.3, 0, 6.283); ctx.fill();

    } else if (id === 'kuchar'){                  // kuchař — vysoká bílá čepice
      ctx.fillStyle = '#fbfaf6';
      ctx.beginPath(); ctx.ellipse(faceX, -R * 1.10, R * 0.50, R * 0.11, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(faceX, -R * 1.54, R * 0.40, R * 0.42, 0, 0, 6.283); ctx.fill(); ctx.stroke();

    } else if (id === 'yeti'){                    // yeti — chlupaté hroty kolem hlavy
      ctx.fillStyle = '#eaf3fb';
      for (let i = -2; i <= 2; i++){
        const a = i * 0.42;
        const bx = faceX + Math.sin(a) * R * 0.48, by = -R * 0.72 - Math.cos(a) * R * 0.48;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.sin(a) * 9, by - R * 0.52);
        ctx.lineTo(bx - Math.sin(a) * 9 * 0.4, by + 2);
        ctx.closePath(); ctx.fill();
      }

    } else if (id === 'ninja'){                   // nindža — maska přes oči, jen oči svítí
      ctx.fillStyle = '#15171b';
      ctx.beginPath(); ctx.ellipse(faceX, -R * 0.78, R * 0.50, R * 0.22, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c94f4f';
      ctx.beginPath(); ctx.ellipse(faceX - 6, -R * 0.78, R * 0.08, R * 0.10, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(faceX + 6, -R * 0.78, R * 0.08, R * 0.10, 0, 0, 6.283); ctx.fill();

    } else if (id === 'kosmonaut'){               // kosmonaut — kulatá přilba s odleskem
      ctx.strokeStyle = 'rgba(160,200,235,.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(faceX, -R * 0.72, R * 0.62, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.ellipse(faceX - 6, -R * 0.92, R * 0.14, R * 0.08, -0.4, 0, 6.283); ctx.fill();
    }
  },

  /* statická ikonka postavy pro obchod — bez fyziky, jen klidová póza */
  previewSkin(ctx, w, h, skinId){
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2 + P.R * 0.5);

    /* podklad za postavičkou — jinak tmavé skiny zaniknou na tmavém pozadí karty */
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, P.R * 2.1);
    bg.addColorStop(0, 'rgba(180,200,225,.16)');
    bg.addColorStop(1, 'rgba(180,200,225,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, 0, P.R * 2.1, 0, 6.283); ctx.fill();

    const fakeP = { x:0, y:0, vx:0, vy:0, side:-1, state:'cling', stun:0, squash:0, face:1 };
    this.player(ctx, { player: fakeP, time: 0 }, 0, skinId);
    ctx.restore();
  },

  vignette(ctx, W, H){
    const gr = ctx.createRadialGradient(W/2, H*0.45, H*0.30, W/2, H*0.5, H*0.78);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  },

  /* ---------- pomůcka na míchání barev ---------- */
  mix(a, b, t){
    t = Math.max(0, Math.min(1, t));
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round((pa >> 16) + ((pb >> 16) - (pa >> 16)) * t);
    const gg = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
    const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
    return 'rgb(' + r + ',' + gg + ',' + bl + ')';
  },
};
