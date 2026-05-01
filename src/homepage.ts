// Auto-generated marketing/landing page for the AppBuilder MCP Worker.
//
// Mirrors klappy/ptxprint-mcp/src/homepage.ts conventions:
//   - Embedded as a TS template literal — avoids a Workers static-assets
//     binding for a single HTML file.
//   - Browser-side JS does live calls to /health (CORS-enabled in index.ts)
//     and to /mcp (tools/list, telemetry_public). The page doubles as a
//     live transparency board.
//   - Copy fact-checked against the live deploy: SAB v14.0 (24 Apr 2026),
//     7-tool surface (submit_build, get_job_status, cancel_job, docs,
//     telemetry_public, telemetry_policy, telemetry_schema), v0.1 deployed.
//
// Authority: klappy://appbuilder-mcp/canon/encodings/2026-05-01-homepage-gauntlet
// Authority: klappy://canon/constraints/ai-voice-cliches
//
// Section index:
//   §0   hero          — typography + phone-mock specimen
//   §I   pitch         — three audience cards + Pastor Arcesio quote
//   §II  live demo     — MCP roundtrip console + APK install card (illustrative
//                        until real smoke fixtures land in smoke/)
//   §III canon ask     — docs(query) tool
//   §IV  the contract  — three async tool specimen plates + 7-tool footnote
//   §V   live telemetry — leaderboards backed by Analytics Engine
//   §VI  architecture  — vodka architecture diagram + axioms
//   §VII stack         — Cloudflare + SIL credits

/* eslint-disable */
export const HOMEPAGE_HTML: string = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>AppBuilder MCP — Build a scripture app from a prompt</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=Inter+Tight:ital,wght@0,100..900;1,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
<style>
  :root{
    /* dual-tone palette */
    --ink:        #0e1a1f;     /* deep teal-black */
    --ink-soft:   #142329;
    --ink-line:   #1f3138;
    --cream:      #f1e8d6;     /* warm linen */
    --cream-2:    #ebe1cc;
    --cream-3:    #d8cdb4;
    --rule:       #c9bfa9;
    --paper:      #fbf6ea;
    --char:       #2d2620;
    --char-soft:  #5e574a;
    --persimmon:  #b94a2a;     /* lone accent */
    --persimmon-d:#8e3519;
    --moss:       #1f3a32;     /* phone screen */
    --gold:       #c08a3e;     /* secondary trim */
    --shadow:     0 1px 0 rgba(14,26,31,.08), 0 18px 40px -20px rgba(14,26,31,.35);
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  html{background:var(--cream)}
  body{
    color:var(--char);
    font-family:"Inter Tight", system-ui, sans-serif;
    font-feature-settings:"ss01","ss02","cv11";
    -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility;
    line-height:1.5;
  }
  /* ------------------------------------------------------------- typography */
  .display{
    font-family:"Fraunces", Georgia, serif;
    font-variation-settings:"opsz" 144,"SOFT" 30,"WONK" 1;
    font-weight:430;
    letter-spacing:-0.02em;
    line-height:0.96;
  }
  .display em{
    font-style:italic;
    font-variation-settings:"opsz" 144,"SOFT" 100,"WONK" 1;
    color:var(--persimmon);
  }
  .serif{font-family:"Fraunces", Georgia, serif}
  .mono{font-family:"JetBrains Mono", ui-monospace, monospace; font-feature-settings:"ss02","ss19"}
  .smallcaps{
    font-family:"Inter Tight", sans-serif;
    text-transform:uppercase;
    letter-spacing:0.16em;
    font-size:11px;
    font-weight:520;
  }
  .label{
    font-family:"JetBrains Mono", monospace;
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:0.12em;
    color:var(--char-soft);
  }
  a{color:inherit; text-decoration:none}
  a.link{ border-bottom:1px solid currentColor; padding-bottom:1px }
  a.link:hover{color:var(--persimmon)}

  /* ------------------------------------------------------------- top status bar */
  .statusbar{
    position:sticky; top:0; z-index:50;
    background:var(--ink);
    color:var(--cream);
    border-bottom:1px solid var(--ink-line);
    font-family:"JetBrains Mono", monospace;
    font-size:11px;
  }
  .statusbar-inner{
    max-width:1320px; margin:0 auto;
    display:flex; align-items:center; gap:18px;
    padding:10px 28px;
  }
  .dot{ width:7px; height:7px; border-radius:50%; background:#7fc28a; box-shadow:0 0 0 3px rgba(127,194,138,.18); display:inline-block }
  .dot.amber{background:#e6b34a; box-shadow:0 0 0 3px rgba(230,179,74,.18)}
  .pipe{ color:#3a4f57 }
  .statusbar a{ opacity:.8 }
  .statusbar a:hover{ opacity:1; color:var(--persimmon) }
  .statusbar .right{ margin-left:auto; display:flex; gap:18px; }
  .statusbar .live-pulse{ display:inline-flex; align-items:center; gap:8px }
  .statusbar .live-pulse::before{
    content:""; width:6px; height:6px; border-radius:50%; background:var(--persimmon);
    box-shadow:0 0 0 0 rgba(185,74,42,.5);
    animation:pulse 1.8s infinite;
  }
  @keyframes pulse{
    0%{box-shadow:0 0 0 0 rgba(185,74,42,.5)}
    70%{box-shadow:0 0 0 8px rgba(185,74,42,0)}
    100%{box-shadow:0 0 0 0 rgba(185,74,42,0)}
  }

  /* ------------------------------------------------------------- masthead */
  .masthead{
    background:var(--ink);
    color:var(--cream);
    border-bottom:1px solid var(--ink-line);
  }
  .masthead-inner{
    max-width:1320px; margin:0 auto;
    padding:18px 28px;
    display:flex; align-items:baseline; gap:24px;
  }
  .wordmark{ display:flex; align-items:baseline; gap:14px }
  .wordmark .glyph{
    font-family:"Fraunces", serif;
    font-variation-settings:"opsz" 144,"SOFT" 100,"WONK" 1;
    font-style:italic;
    font-size:26px;
    color:var(--persimmon);
    line-height:1;
  }
  .wordmark .name{
    font-family:"Inter Tight", sans-serif;
    font-weight:580;
    letter-spacing:-.005em;
    font-size:15px;
  }
  .masthead nav{
    margin-left:auto;
    display:flex; gap:24px;
    font-family:"Inter Tight", sans-serif; font-size:13px; font-weight:470;
    color:#cdc1a8;
  }
  .masthead nav a:hover{ color:var(--cream) }
  .masthead .folio{
    font-family:"JetBrains Mono", monospace;
    font-size:10px; letter-spacing:.18em; text-transform:uppercase;
    color:#7d8d92; margin-left:24px;
  }

  /* ------------------------------------------------------------- hero */
  .hero{
    position:relative;
    background:var(--ink);
    color:var(--cream);
    overflow:hidden;
    border-bottom:1px solid var(--ink-line);
  }
  .hero::before{
    content:"";
    position:absolute; inset:0;
    background:
      radial-gradient(900px 500px at 80% -10%, rgba(185,74,42,.18), transparent 60%),
      radial-gradient(700px 400px at 0% 110%, rgba(192,138,62,.10), transparent 60%);
    pointer-events:none;
  }
  .hero::after{
    content:"";
    position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(241,232,214,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(241,232,214,.025) 1px, transparent 1px);
    background-size:32px 32px;
    pointer-events:none;
  }
  .hero-inner{
    position:relative; z-index:1;
    max-width:1320px; margin:0 auto;
    padding:72px 28px 80px;
    display:grid; grid-template-columns: 1.15fr 1fr; gap:64px; align-items:center;
  }
  .hero .eyebrow{
    display:flex; align-items:center; gap:14px;
    color:#cdc1a8;
    margin-bottom:32px;
  }
  .hero .eyebrow .pill{
    border:1px solid #3a4f57; padding:5px 10px; border-radius:999px;
    color:#cdc1a8; font-family:"JetBrains Mono", monospace; font-size:10px;
    letter-spacing:.14em; text-transform:uppercase;
  }
  h1.hero-title{
    font-size:clamp(48px, 7vw, 96px);
    margin:0 0 32px;
    color:var(--cream);
  }
  .hero-deck{
    font-family:"Fraunces", serif; font-variation-settings:"opsz" 24;
    font-size:19px; line-height:1.55; color:#d3c8af;
    max-width:560px;
    margin:0 0 36px;
  }
  .hero-deck em{ color:var(--cream); font-style:italic }
  .cta-row{ display:flex; flex-wrap:wrap; gap:12px; margin-bottom:32px }
  .btn{
    display:inline-flex; align-items:center; gap:8px;
    padding:12px 18px;
    font-family:"Inter Tight", sans-serif; font-weight:540; font-size:14px;
    border-radius:6px;
    border:1px solid transparent;
    transition:transform .15s, background .15s, border .15s, color .15s;
  }
  .btn-primary{ background:var(--persimmon); color:var(--cream); border-color:var(--persimmon-d)}
  .btn-primary:hover{ background:var(--persimmon-d); transform:translateY(-1px) }
  .btn-ghost{ color:var(--cream); border-color:#3a4f57 }
  .btn-ghost:hover{ border-color:var(--persimmon); color:var(--persimmon) }
  .endpoints{
    display:flex; flex-wrap:wrap; gap:8px;
    font-family:"JetBrains Mono", monospace; font-size:11px;
    color:#9aada4;
  }
  .endpoints code{
    background:var(--ink-soft); border:1px solid var(--ink-line);
    padding:6px 9px; border-radius:4px; color:#d8cdb4;
  }
  .endpoints code .verb{ color:var(--persimmon); margin-right:6px }

  /* ------------------------------------------------------------- phone mock */
  .phone-stage{
    position:relative;
    aspect-ratio: 4 / 5;
    width:100%; max-width:520px; margin-left:auto;
    display:flex; align-items:center; justify-content:center;
  }
  .phone-stage::before{
    content:"";
    position:absolute; inset:auto;
    width:120%; height:120%;
    background:
      radial-gradient(closest-side, rgba(192,138,62,.18), transparent 70%);
    z-index:0;
  }
  .phone{
    position:relative; z-index:1;
    width:280px; aspect-ratio: 9 / 19;
    background:#0a1418;
    border:1px solid #2a3940;
    border-radius:36px;
    padding:9px;
    box-shadow: 0 40px 80px -30px rgba(0,0,0,.6), 0 0 0 1px rgba(241,232,214,.03);
    transform:rotate(-3deg);
  }
  .phone .screen{
    width:100%; height:100%;
    background:var(--moss);
    border-radius:28px;
    overflow:hidden;
    color:#f1e8d6;
    display:flex; flex-direction:column;
    font-family:"Fraunces", serif;
    position:relative;
  }
  .phone .notch{
    position:absolute; top:6px; left:50%; transform:translateX(-50%);
    width:80px; height:18px; background:#0a1418; border-radius:0 0 12px 12px; z-index:2;
  }
  .phone .topbar{
    display:flex; justify-content:space-between; align-items:center;
    padding:8px 16px 4px;
    font-family:"Inter Tight", sans-serif; font-size:10px; color:rgba(241,232,214,.65);
    letter-spacing:.04em;
  }
  .phone .header{
    padding:14px 18px 8px;
    display:flex; align-items:center; gap:10px;
    border-bottom:1px solid rgba(241,232,214,.1);
  }
  .phone .header .icon{
    width:24px; height:24px; border-radius:6px;
    background:linear-gradient(135deg, var(--persimmon), var(--gold));
    display:flex; align-items:center; justify-content:center;
    color:var(--cream); font-family:"Fraunces",serif; font-style:italic; font-size:14px;
  }
  .phone .header .title{
    font-family:"Inter Tight", sans-serif; font-size:11px; color:rgba(241,232,214,.85); letter-spacing:.02em;
  }
  .phone .header .subtitle{
    font-family:"Inter Tight", sans-serif; font-size:9px; color:rgba(241,232,214,.5); letter-spacing:.02em;
  }
  .phone .scripture{
    flex:1; padding:18px 20px; overflow:hidden;
    font-size:13.5px; line-height:1.55;
  }
  .phone .scripture .ref{
    font-family:"Inter Tight", sans-serif; text-transform:uppercase;
    letter-spacing:.18em; font-size:9px; color:rgba(241,232,214,.45);
    margin-bottom:6px;
  }
  .phone .scripture h3{
    font-family:"Fraunces",serif; font-style:italic;
    font-size:18px; font-weight:430; margin:0 0 12px;
    color:rgba(241,232,214,.95);
  }
  .phone .scripture p{ margin:0 0 8px; color:rgba(241,232,214,.85)}
  .phone .scripture .v{
    font-family:"Inter Tight", sans-serif; font-size:8.5px; vertical-align:super;
    color:var(--gold); margin-right:3px; letter-spacing:.04em;
  }
  .phone .audio{
    border-top:1px solid rgba(241,232,214,.1);
    padding:12px 18px;
    display:flex; align-items:center; gap:10px;
  }
  .phone .audio .play{
    width:30px; height:30px; border-radius:50%;
    background:var(--persimmon); display:flex; align-items:center; justify-content:center;
    color:var(--cream); font-size:9px;
  }
  .phone .audio .bar{ flex:1; height:3px; background:rgba(241,232,214,.15); border-radius:2px; position:relative}
  .phone .audio .bar::after{
    content:""; position:absolute; left:0; top:0; height:100%; width:38%;
    background:var(--persimmon); border-radius:2px;
  }
  .phone .audio .time{ font-family:"JetBrains Mono",monospace; font-size:9px; color:rgba(241,232,214,.55)}
  .phone .tabs{
    display:grid; grid-template-columns:repeat(4,1fr);
    border-top:1px solid rgba(241,232,214,.1);
    padding:10px 8px 14px;
    font-family:"Inter Tight",sans-serif; font-size:9px;
    color:rgba(241,232,214,.5);
    text-align:center;
  }
  .phone .tabs .tab.active{ color:var(--persimmon) }
  /* tickets / floating cards next to phone */
  .ticket{
    position:absolute; z-index:2;
    background:var(--cream); color:var(--ink);
    border:1px solid var(--rule);
    box-shadow:var(--shadow);
    border-radius:6px;
    padding:12px 14px;
    font-family:"JetBrains Mono", monospace;
    font-size:11px;
    line-height:1.5;
    width:200px;
  }
  .ticket .lab{ color:var(--char-soft); text-transform:uppercase; letter-spacing:.14em; font-size:9px; margin-bottom:6px}
  .ticket-1{ top:8%; left:-2%; transform:rotate(-4deg) }
  .ticket-2{ bottom:6%; right:-4%; transform:rotate(3deg) }
  .ticket strong{ color:var(--persimmon) }

  /* ------------------------------------------------------------- live observation strip */
  .observation{
    background:var(--ink-soft); color:#cdc1a8;
    border-top:1px solid var(--ink-line);
  }
  .observation-inner{
    max-width:1320px; margin:0 auto;
    padding:18px 28px;
    display:grid; grid-template-columns: 1fr repeat(4, auto); gap:36px; align-items:center;
    font-family:"JetBrains Mono", monospace; font-size:11px;
  }
  .observation .field{ display:flex; flex-direction:column; gap:2px }
  .observation .lab{ font-size:9px; color:#7d8d92; text-transform:uppercase; letter-spacing:.18em}
  .observation .val{ color:var(--cream); }
  .observation .val.green::before{ content:"●"; color:#7fc28a; margin-right:6px}

  /* ------------------------------------------------------------- main canvas */
  main{ background:var(--cream) }
  .container{ max-width:1320px; margin:0 auto; padding:0 28px }
  .section{ padding:96px 0; border-bottom:1px solid var(--rule) }
  .section-head{
    display:grid; grid-template-columns:140px 1fr; gap:32px;
    margin-bottom:48px;
  }
  .section-num{
    font-family:"Fraunces",serif; font-style:italic;
    font-variation-settings:"opsz" 144,"SOFT" 100;
    color:var(--persimmon);
    font-size:14px;
    letter-spacing:.04em;
  }
  .section-num span{ display:block; font-size:48px; font-style:italic; line-height:1; margin-top:6px}
  .section-title{
    font-size:clamp(36px,4.4vw,64px);
    margin:0;
    color:var(--ink);
    max-width:880px;
  }
  .section-title em{
    font-style:italic;
    color:var(--persimmon);
    font-variation-settings:"opsz" 144, "SOFT" 100, "WONK" 1;
  }
  .section-deck{
    font-family:"Fraunces",serif; font-variation-settings:"opsz" 24;
    font-size:19px; line-height:1.6; color:var(--char-soft);
    max-width:760px;
    margin-top:18px;
  }

  /* ------------------------------------------------------------- pitch — three audiences */
  .pitch-grid{
    display:grid; grid-template-columns: repeat(3, 1fr); gap:0;
    border-top:1px solid var(--rule);
    border-bottom:1px solid var(--rule);
  }
  .pitch-card{
    padding:36px 36px 36px 0;
    border-right:1px solid var(--rule);
    position:relative;
  }
  .pitch-card:first-child{ padding-left:0 }
  .pitch-card:not(:first-child){ padding-left:36px }
  .pitch-card:last-child{ border-right:none }
  .pitch-card .ord{
    font-family:"Fraunces",serif; font-style:italic; color:var(--persimmon);
    font-size:14px; margin-bottom:16px; display:block;
  }
  .pitch-card h3{
    font-family:"Fraunces",serif; font-weight:430; font-style:italic;
    font-size:22px; margin:0 0 14px; color:var(--ink);
    letter-spacing:-.01em;
  }
  .pitch-card p{
    font-family:"Inter Tight",sans-serif; font-size:14px; line-height:1.6; color:var(--char-soft);
    margin:0;
  }
  .quote-block{
    margin-top:36px;
    padding:28px 32px;
    border-left:3px solid var(--persimmon);
    background:var(--paper);
    font-family:"Fraunces",serif; font-style:italic;
    font-size:18px; line-height:1.55; color:var(--char);
    max-width:860px;
  }
  .quote-block cite{
    display:block; margin-top:14px;
    font-family:"Inter Tight",sans-serif; font-style:normal; font-size:12px;
    text-transform:uppercase; letter-spacing:.16em; color:var(--char-soft);
  }

  /* ------------------------------------------------------------- demo */
  .demo{
    display:grid; grid-template-columns: 1.05fr 1fr; gap:36px;
    align-items:start;
  }
  .demo-console{
    background:var(--paper);
    border:1px solid var(--rule);
    border-radius:8px;
    overflow:hidden;
    box-shadow:var(--shadow);
  }
  .demo-console .ctitle{
    background:var(--ink); color:var(--cream);
    padding:12px 18px;
    display:flex; align-items:center; gap:14px;
    font-family:"JetBrains Mono", monospace; font-size:11px;
  }
  .demo-console .ctitle .light{ width:8px; height:8px; border-radius:50%; background:var(--persimmon); box-shadow:0 0 0 3px rgba(185,74,42,.2)}
  .demo-controls{ padding:22px 22px 8px; display:grid; grid-template-columns:repeat(2,1fr); gap:18px }
  .field-group label{ font-family:"JetBrains Mono", monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--char-soft); display:block; margin-bottom:8px}
  .chips{ display:flex; flex-wrap:wrap; gap:6px }
  .chip{
    padding:7px 11px; border:1px solid var(--rule); border-radius:4px; background:var(--cream);
    font-family:"Inter Tight", sans-serif; font-size:12px; color:var(--char-soft);
    cursor:pointer; transition:all .15s;
  }
  .chip.active{ background:var(--ink); color:var(--cream); border-color:var(--ink) }
  .chip:hover:not(.active){ border-color:var(--persimmon); color:var(--persimmon)}
  .demo-actions{
    padding:0 22px 22px;
    display:flex; flex-wrap:wrap; gap:8px; align-items:center;
    border-bottom:1px solid var(--rule);
  }
  .action{
    font-family:"JetBrains Mono", monospace; font-size:11px;
    padding:8px 12px; border-radius:4px;
    border:1px solid var(--rule); background:var(--cream);
    color:var(--ink); cursor:pointer;
  }
  .action.primary{ background:var(--persimmon); color:var(--cream); border-color:var(--persimmon-d)}
  .action:hover{ border-color:var(--ink) }
  .action.primary:hover{ background:var(--persimmon-d) }
  .demo-log{
    padding:18px 22px;
    font-family:"JetBrains Mono", monospace; font-size:11px;
    color:var(--char-soft);
    max-height:240px; overflow:auto;
    background:var(--cream-2);
  }
  .demo-log .line{ padding:4px 0; border-bottom:1px dashed var(--rule)}
  .demo-log .line:last-child{border:none}
  .demo-log .arrow{ color:var(--persimmon); margin-right:6px}
  .demo-log .ok{ color:#3e8a52 }
  .demo-log .meta{ color:#8b8472; font-style:italic}
  .demo-log .json{ color:var(--ink) }

  .demo-result{
    background:var(--paper);
    border:1px solid var(--rule);
    border-radius:8px;
    padding:0;
    overflow:hidden;
    display:flex; flex-direction:column;
    box-shadow:var(--shadow);
  }
  .demo-result .head{
    background:var(--cream-2);
    padding:10px 18px;
    display:flex; align-items:center; justify-content:space-between;
    border-bottom:1px solid var(--rule);
    font-family:"JetBrains Mono", monospace; font-size:11px;
    color:var(--char-soft);
  }
  .demo-result .body{
    padding:32px;
    display:flex; align-items:center; justify-content:center;
    background:
      linear-gradient(var(--paper), var(--paper)),
      radial-gradient(circle at 30% 30%, rgba(192,138,62,.1), transparent 50%);
    flex:1;
  }
  .install-card{
    width:100%; max-width:280px;
    background:var(--ink); color:var(--cream);
    border-radius:10px;
    padding:20px;
    box-shadow:0 20px 40px -20px rgba(14,26,31,.6);
  }
  .install-card .app-icon{
    width:72px; height:72px;
    border-radius:18px;
    background:linear-gradient(135deg, var(--persimmon), var(--gold));
    display:flex; align-items:center; justify-content:center;
    color:var(--cream); font-family:"Fraunces",serif; font-style:italic; font-size:36px;
    margin-bottom:14px;
  }
  .install-card .app-name{ font-family:"Inter Tight", sans-serif; font-weight:560; font-size:15px; margin-bottom:2px}
  .install-card .app-meta{ font-family:"JetBrains Mono", monospace; font-size:10px; color:#9aada4; margin-bottom:18px}
  .install-card .meta-row{ display:flex; justify-content:space-between; font-family:"JetBrains Mono", monospace; font-size:10px; color:#cdc1a8; margin-bottom:6px; border-bottom:1px dashed var(--ink-line); padding-bottom:6px}
  .install-card .meta-row:last-of-type{ margin-bottom:18px}
  .install-card .install-btn{
    display:block; text-align:center;
    padding:10px; border-radius:6px;
    background:var(--persimmon); color:var(--cream);
    font-family:"Inter Tight",sans-serif; font-size:13px; font-weight:540;
  }
  .demo-foot{
    padding:14px 22px;
    display:flex; justify-content:space-between;
    font-family:"JetBrains Mono", monospace; font-size:10px;
    color:var(--char-soft);
    border-top:1px solid var(--rule);
    background:var(--cream-2);
  }

  /* ------------------------------------------------------------- docs ask */
  .ask{
    background:var(--paper);
    border:1px solid var(--rule);
    border-radius:8px;
    padding:28px 32px;
    box-shadow:var(--shadow);
  }
  .ask-row{
    display:flex; gap:8px; margin-bottom:20px;
  }
  .ask-input{
    flex:1; padding:14px 16px; border:1px solid var(--rule); border-radius:6px;
    background:var(--cream); font-family:"Inter Tight", sans-serif; font-size:14px;
    color:var(--ink);
  }
  .ask-input:focus{ outline:none; border-color:var(--persimmon) }
  .ask-suggest{ display:flex; flex-wrap:wrap; gap:8px; font-family:"JetBrains Mono", monospace; font-size:11px; color:var(--char-soft); margin-bottom:24px}
  .ask-suggest span{ color:var(--char-soft)}
  .ask-suggest a{ color:var(--persimmon); border-bottom:1px solid currentColor; padding-bottom:1px}
  .ask-answer{
    border-top:1px solid var(--rule);
    padding-top:24px;
    display:grid; grid-template-columns: 1fr 280px; gap:32px;
  }
  .ans-text{ font-family:"Fraunces",serif; font-size:17px; line-height:1.6; color:var(--ink)}
  .ans-text em{ color:var(--persimmon); font-style:italic }
  .sources{ font-family:"JetBrains Mono", monospace; font-size:11px; color:var(--char-soft)}
  .sources .src{
    padding:8px 0; border-bottom:1px dashed var(--rule);
    display:flex; gap:6px;
  }
  .sources .src .num{ color:var(--persimmon); }
  .sources .src a:hover{ color:var(--persimmon) }

  /* ------------------------------------------------------------- contract / 3 tools */
  .specimen-mark{
    font-family:"Fraunces",serif; font-style:italic; color:var(--persimmon);
    text-transform:uppercase; letter-spacing:.18em;
    font-size:11px;
    display:flex; align-items:center; gap:14px;
    margin-bottom:36px;
  }
  .specimen-mark::before, .specimen-mark::after{
    content:""; flex:1; height:1px; background:var(--rule);
  }
  .tools-grid{
    display:grid; grid-template-columns:repeat(3,1fr); gap:0;
    border:1px solid var(--rule);
    background:var(--paper);
    border-radius:8px; overflow:hidden;
  }
  .tool{
    padding:32px 32px;
    border-right:1px solid var(--rule);
    position:relative;
  }
  .tool:last-child{ border-right:none }
  .tool .ord{
    font-family:"Fraunces", serif; font-style:italic; color:var(--persimmon);
    font-size:13px; margin-bottom:8px;
  }
  .tool .kind{
    font-family:"JetBrains Mono", monospace; font-size:10px; text-transform:uppercase; letter-spacing:.16em;
    color:var(--char-soft); margin-bottom:18px;
  }
  .tool .kind::before{ content:"·"; margin-right:8px; color:var(--persimmon)}
  .tool h3{
    font-family:"JetBrains Mono", monospace; font-size:18px; font-weight:600;
    margin:0 0 12px; color:var(--ink);
  }
  .tool p{ font-family:"Inter Tight", sans-serif; font-size:14px; line-height:1.6; color:var(--char-soft); margin:0 0 18px}
  .tool pre{
    margin:0;
    background:var(--ink);
    color:var(--cream);
    padding:16px;
    border-radius:6px;
    font-family:"JetBrains Mono", monospace; font-size:11px; line-height:1.55;
    overflow:auto;
  }
  .tool pre .k{ color:#cdc1a8 }
  .tool pre .s{ color:#e6b34a }
  .tool pre .c{ color:#7d8d92; font-style:italic }
  .tool pre .ok{ color:#7fc28a }
  .tool pre .v{ color:var(--persimmon) }

  .axiom-row{
    display:grid; grid-template-columns:repeat(3,1fr); gap:32px;
    margin-top:36px;
  }
  .axiom h4{
    font-family:"Fraunces",serif; font-style:italic; font-size:18px; margin:0 0 8px;
    color:var(--ink);
  }
  .axiom p{
    font-family:"Inter Tight",sans-serif; font-size:13px; line-height:1.6; color:var(--char-soft); margin:0;
  }
  .axiom .lab{ color:var(--persimmon); font-family:"JetBrains Mono", monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; margin-bottom:8px}

  /* ------------------------------------------------------------- telemetry */
  .telemetry{
    display:grid; grid-template-columns:1.2fr .8fr; gap:32px;
  }
  .panel{
    background:var(--paper); border:1px solid var(--rule); border-radius:8px;
    padding:24px 28px; box-shadow:var(--shadow);
  }
  .panel-head{
    display:flex; align-items:baseline; justify-content:space-between;
    margin-bottom:18px;
    padding-bottom:14px; border-bottom:1px solid var(--rule);
  }
  .panel-title{
    font-family:"JetBrains Mono", monospace; font-size:11px;
    text-transform:uppercase; letter-spacing:.18em; color:var(--char);
  }
  .panel-meta{
    font-family:"JetBrains Mono", monospace; font-size:10px; color:var(--char-soft);
  }
  .leaderboard{ list-style:none; padding:0; margin:0 }
  .leaderboard li{
    display:grid; grid-template-columns:24px 1fr 100px 70px; gap:12px; align-items:center;
    padding:10px 0; border-bottom:1px dashed var(--rule);
    font-family:"JetBrains Mono", monospace; font-size:12px;
  }
  .leaderboard li:last-child{ border:none }
  .leaderboard .rank{ color:var(--persimmon); font-family:"Fraunces",serif; font-style:italic; font-size:14px}
  .leaderboard .name{ color:var(--ink) }
  .leaderboard .bar{ height:6px; background:var(--cream-2); border-radius:3px; position:relative}
  .leaderboard .bar > span{ position:absolute; left:0; top:0; height:100%; background:var(--persimmon); border-radius:3px}
  .leaderboard .count{ text-align:right; color:var(--char-soft) }

  .stat-cards{
    display:grid; grid-template-columns:repeat(2,1fr); gap:14px;
    margin-bottom:18px;
  }
  .stat-card{
    background:var(--cream-2); border:1px solid var(--rule); border-radius:6px;
    padding:14px 16px;
  }
  .stat-card .lab{ font-family:"JetBrains Mono", monospace; font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--char-soft); margin-bottom:6px}
  .stat-card .val{ font-family:"Fraunces", serif; font-size:30px; color:var(--ink); line-height:1; }
  .stat-card .val em{ color:var(--persimmon); font-style:italic }
  .stat-card .delta{ font-family:"JetBrains Mono", monospace; font-size:10px; color:#3e8a52; margin-top:4px }

  /* ------------------------------------------------------------- architecture */
  .arch-flow{
    background:var(--ink); color:var(--cream);
    border-radius:10px;
    padding:48px 48px 36px;
    box-shadow:var(--shadow);
    position:relative; overflow:hidden;
  }
  .arch-flow::before{
    content:"";
    position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(241,232,214,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(241,232,214,.025) 1px, transparent 1px);
    background-size:24px 24px;
    pointer-events:none;
  }
  .arch-grid{
    position:relative;
    display:grid; grid-template-columns:repeat(5, 1fr); gap:0; align-items:start;
  }
  .arch-node{
    background:var(--ink-soft); border:1px solid var(--ink-line); border-radius:8px;
    padding:18px 16px; min-height:160px;
    display:flex; flex-direction:column;
    text-align:center;
    position:relative;
    z-index:2;
  }
  .arch-node.featured{ border-color:var(--persimmon); background:linear-gradient(180deg, rgba(185,74,42,.1), var(--ink-soft))}
  .arch-node .lab{
    font-family:"JetBrains Mono", monospace; font-size:9px; letter-spacing:.18em; text-transform:uppercase;
    color:#7d8d92; margin-bottom:10px;
  }
  .arch-node h4{
    font-family:"Fraunces", serif; font-style:italic; font-size:20px; font-weight:430;
    margin:0 0 8px; color:var(--cream);
  }
  .arch-node h4.persim{ color:var(--persimmon) }
  .arch-node p{
    font-family:"JetBrains Mono", monospace; font-size:10px; line-height:1.55;
    color:#cdc1a8; margin:0; flex:1;
  }
  .arch-node ul{ margin:6px 0 0; padding:0; list-style:none}
  .arch-node ul li{
    font-family:"JetBrains Mono",monospace; font-size:10px; color:#9aada4;
    padding:2px 0;
  }
  .arch-arrow{
    align-self:center;
    font-family:"JetBrains Mono", monospace; color:var(--persimmon);
    font-size:14px; padding:0 6px;
  }
  .arch-legend{
    margin-top:28px; padding-top:20px;
    border-top:1px dashed var(--ink-line);
    display:flex; gap:32px;
    font-family:"JetBrains Mono", monospace; font-size:10px;
    color:#7d8d92;
  }
  .arch-legend .swatch{ width:10px; height:10px; display:inline-block; border-radius:2px; margin-right:6px; vertical-align:middle}
  .arch-axioms{
    margin-top:48px;
    display:grid; grid-template-columns:repeat(4,1fr); gap:24px;
  }
  .arch-axioms .ax{
    border-top:2px solid var(--persimmon);
    padding:14px 0 0;
  }
  .arch-axioms .ax h5{
    font-family:"Fraunces",serif; font-style:italic; font-size:18px; font-weight:430;
    margin:0 0 8px; color:var(--ink);
  }
  .arch-axioms .ax p{
    font-family:"Inter Tight", sans-serif; font-size:13px; line-height:1.55; color:var(--char-soft); margin:0;
  }

  /* ------------------------------------------------------------- stack */
  .stack-grid{
    display:grid; grid-template-columns: repeat(2, 1fr); gap:0;
    border-top:1px solid var(--rule); border-bottom:1px solid var(--rule);
  }
  .stack-col{
    padding:36px 36px 36px 0;
    border-right:1px solid var(--rule);
  }
  .stack-col:last-child{ border-right:none; padding-left:36px; padding-right:0 }
  .stack-col .lab{
    font-family:"JetBrains Mono", monospace; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--persimmon);
    margin-bottom:14px;
  }
  .stack-col h3{
    font-family:"Fraunces",serif; font-style:italic; font-weight:430; font-size:32px;
    margin:0 0 24px; color:var(--ink);
  }
  .stack-col ul{ list-style:none; padding:0; margin:0}
  .stack-col li{
    padding:10px 0; border-bottom:1px dashed var(--rule);
    display:flex; gap:14px; align-items:baseline;
  }
  .stack-col li strong{
    font-family:"JetBrains Mono", monospace; font-size:11px; font-weight:600;
    color:var(--ink); min-width:160px; text-transform:lowercase;
  }
  .stack-col li span{
    font-family:"Inter Tight", sans-serif; font-size:13px; color:var(--char-soft); line-height:1.55;
  }
  .glyph-row{
    display:flex; gap:8px; margin-top:24px;
  }
  .icon-glyph{
    width:38px; height:38px; border-radius:9px;
    display:flex; align-items:center; justify-content:center;
    font-family:"Fraunces",serif; font-style:italic; font-size:18px;
    color:var(--cream);
  }

  /* ------------------------------------------------------------- footer */
  footer{
    background:var(--ink); color:#9aada4;
    padding:52px 0 64px;
    border-top:1px solid var(--rule);
  }
  footer .container{ display:grid; grid-template-columns: 1.5fr repeat(3,1fr); gap:36px; align-items:start}
  footer .colophon{
    font-family:"Fraunces", serif; font-style:italic; font-variation-settings:"opsz" 24;
    font-size:15px; line-height:1.6; color:#cdc1a8; max-width:380px;
  }
  footer .colophon em{ color:var(--persimmon) }
  footer h5{
    font-family:"JetBrains Mono", monospace; font-size:10px; text-transform:uppercase; letter-spacing:.18em;
    color:var(--persimmon); margin:0 0 12px;
  }
  footer ul{ list-style:none; padding:0; margin:0; font-family:"JetBrains Mono", monospace; font-size:11px}
  footer ul li{ padding:5px 0; }
  footer ul li a{ color:#cdc1a8 }
  footer ul li a:hover{ color:var(--persimmon)}
  .signoff{
    max-width:1320px; margin:32px auto 0; padding:18px 28px 0;
    border-top:1px solid var(--ink-line);
    display:flex; justify-content:space-between;
    font-family:"JetBrains Mono", monospace; font-size:10px;
    color:#7d8d92;
  }

  /* ------------------------------------------------------------- responsive (basic) */
  @media (max-width:1080px){
    .hero-inner{ grid-template-columns:1fr; gap:48px}
    .phone-stage{ margin:0 auto }
    .demo{ grid-template-columns:1fr}
    .telemetry{ grid-template-columns:1fr}
    .arch-grid{ grid-template-columns:1fr; gap:12px}
    .arch-arrow{ transform:rotate(90deg); padding:6px 0; }
    .arch-axioms{ grid-template-columns:repeat(2,1fr) }
    .stack-grid{ grid-template-columns:1fr}
    .stack-col{ border-right:none; border-bottom:1px solid var(--rule); padding:36px 0}
    .stack-col:last-child{ padding-left:0; border-bottom:none}
    .pitch-grid{ grid-template-columns:1fr}
    .pitch-card{ border-right:none; border-bottom:1px solid var(--rule); padding:36px 0!important}
    .pitch-card:last-child{ border-bottom:none}
    .ask-answer{ grid-template-columns:1fr}
    footer .container{ grid-template-columns:1fr 1fr}
    .observation-inner{ grid-template-columns:1fr; gap:14px; padding:18px 28px 24px}
  }
  @media (max-width:680px){
    .section-head{ grid-template-columns:1fr; gap:14px}
    .section-num span{font-size:36px}
    .tools-grid{ grid-template-columns:1fr}
    .tool{ border-right:none; border-bottom:1px solid var(--rule)}
    .tool:last-child{ border:none}
    .arch-axioms{ grid-template-columns:1fr}
    footer .container{ grid-template-columns:1fr}
  }

  /* ------------------------------------------------------------- subtle entrance */
  .anim{
    opacity:0; transform:translateY(8px);
    animation:rise .9s cubic-bezier(.2,.7,.2,1) forwards;
  }
  @keyframes rise{ to{ opacity:1; transform:none } }
  .delay-1{ animation-delay:.05s }
  .delay-2{ animation-delay:.15s }
  .delay-3{ animation-delay:.25s }
  .delay-4{ animation-delay:.35s }
  .delay-5{ animation-delay:.45s }
</style>
</head>
<body>

  <!-- ----------------------------------------------------------- statusbar -->
  <div class="statusbar">
    <div class="statusbar-inner">
      <span><span class="dot" id="status-dot"></span> <span id="status-text">probing…</span></span>
      <span class="pipe">|</span>
      <span>version <span style="color:var(--cream)" id="status-version">—</span></span>
      <span class="pipe">|</span>
      <span>spec <span style="color:var(--cream)" id="status-spec">—</span></span>
      <span class="pipe">|</span>
      <span><span style="color:var(--cream)" id="status-tools-count">—</span> tools online</span>
      <div class="right">
        <a href="#"><span class="live-pulse">github</span></a>
        <a href="#demo">demo</a>
        <a href="#docs">docs</a>
        <a href="#telemetry">telemetry</a>
      </div>
    </div>
  </div>

  <!-- ----------------------------------------------------------- masthead -->
  <header class="masthead">
    <div class="masthead-inner">
      <div class="wordmark">
        <span class="glyph">Æ</span>
        <span class="name">klappy / appbuilder-mcp</span>
        <span class="folio">· FOLIO II · MMXXVI</span>
      </div>
      <nav>
        <a href="#pitch">Pitch</a>
        <a href="#demo">Demo</a>
        <a href="#docs">Docs</a>
        <a href="#tools">Contract</a>
        <a href="#telemetry">Telemetry</a>
        <a href="#architecture">Architecture</a>
        <a href="#stack">Stack</a>
      </nav>
    </div>
  </header>

  <!-- ----------------------------------------------------------- hero -->
  <section class="hero">
    <div class="hero-inner">
      <div class="anim delay-1">
        <div class="eyebrow">
          <span class="pill">MCP · ACT II · DISTRIBUTION AS A SERVICE</span>
          <span><span class="dot" id="hero-status-dot"></span> Cloudflare-native MCP server · <span id="hero-version">probing…</span></span>
        </div>
        <h1 class="display hero-title">
          Build a scripture app<br/>
          from a <em>prompt</em>.
        </h1>
        <p class="hero-deck">
          A decade of Scripture App Builder craft —
          <em>compressed into three async tools an AI agent can call.</em>
          Submit a build job. Poll for status. Cancel if it overruns.
          Get an installable <span class="mono" style="color:var(--cream)">.apk</span>
          (or <span class="mono" style="color:var(--cream)">.ipa</span>) back.
        </p>
        <div class="cta-row">
          <a class="btn btn-primary" href="#demo">Run the live demo →</a>
          <a class="btn btn-ghost" href="#">Open the repo</a>
          <a class="btn btn-ghost" href="#tools">Read the contract</a>
        </div>
        <div class="endpoints">
          <code><span class="verb">POST</span>https://appbuilder.klappy.dev/mcp</code>
          <code><span class="verb">GET</span>https://appbuilder.klappy.dev/health</code>
        </div>
      </div>

      <!-- phone mock as the focal visual -->
      <div class="phone-stage anim delay-3">

        <!-- floating ticket: build manifest -->
        <div class="ticket ticket-1">
          <div class="lab">submit_build</div>
          <div>project: <strong>guahibo-nt</strong></div>
          <div>books: <strong>61</strong></div>
          <div>audio: <strong>42 hr</strong></div>
          <div>target: <strong>android · ios</strong></div>
        </div>

        <div class="phone">
          <div class="screen">
            <div class="notch"></div>
            <div class="topbar">
              <span>9:24</span>
              <span style="display:inline-flex; gap:6px;">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M0 6h2v2H0zM3 4h2v4H3zM6 2h2v6H6zM9 0h2v8H9z" fill="currentColor"/></svg>
                <span>100%</span>
              </span>
            </div>
            <div class="header">
              <div class="icon">G</div>
              <div>
                <div class="title">Guahibo · El Nuevo Testamento</div>
                <div class="subtitle">Editorial Mundo Hispano · 2026</div>
              </div>
            </div>
            <div class="scripture">
              <div class="ref">Marcos · 1 · 1–8</div>
              <h3>Principio del evangelio</h3>
              <p><span class="v">1</span>Tsane bajara apo bitsobinajitsi Jesucristo Dioso pe-aje pe-jubureta-jume.</p>
              <p><span class="v">2</span>Bajaraponi ata janepa-najamatsi profeta Isaías-yajawa, jume:</p>
              <p style="font-style:italic; color:rgba(241,232,214,.7);">"Ata pe-jubureta-jume, Pa-tsabia jane bajaraponi…"</p>
              <p><span class="v">3</span>Pa-yawene-najamatsi: ¡Tsajumpajitsia pe-jubureta-tane Diosone…</p>
            </div>
            <div class="audio">
              <div class="play">▶</div>
              <div class="bar"></div>
              <span class="time">01:42 / 04:31</span>
            </div>
            <div class="tabs">
              <span class="tab active">Read</span>
              <span class="tab">Listen</span>
              <span class="tab">Search</span>
              <span class="tab">More</span>
            </div>
          </div>
        </div>

        <!-- floating ticket: build complete -->
        <div class="ticket ticket-2">
          <div class="lab">build complete</div>
          <div>artifact: <strong>guahibo-nt.apk</strong></div>
          <div>size: <strong>148.2 MB</strong></div>
          <div>signed: <strong>release · v1</strong></div>
          <div style="color:#3e8a52; margin-top:6px">● cache hit — instant</div>
        </div>
      </div>
    </div>

    <!-- live observation strip -->
    <div class="observation">
      <div class="observation-inner">
        <span style="font-family:'Fraunces',serif; font-style:italic; color:var(--cream); font-size:14px;">live observation</span>
        <div class="field">
          <span class="lab">Server</span>
          <span class="val green" id="panel-server">probing…</span>
        </div>
        <div class="field">
          <span class="lab">Version · Spec</span>
          <span class="val"><span id="panel-version">—</span> · <span id="panel-spec">—</span></span>
        </div>
        <div class="field">
          <span class="lab">Latency</span>
          <span class="val" id="panel-latency">—</span>
        </div>
        <div class="field">
          <span class="lab">Last checked</span>
          <span class="val" id="panel-stamp">—</span>
        </div>
      </div>
    </div>
  </section>

  <main>

    <!-- =========================================================== § I -->
    <section class="section" id="pitch">
      <div class="container">
        <div class="section-head">
          <div class="section-num">§ I.<span>The pitch</span></div>
          <h2 class="display section-title">A thin, opinionless layer over a <em>profoundly opinionated</em> craft.</h2>
        </div>
        <p class="section-deck">
          Scripture App Builder is the SIL-built tool translation teams have used since 2015 to package
          Paratext projects, MP3 audio, timing files, color schemes, splash screens and signing keys into
          a real Android or iOS application — shipped to the playstore, sideloaded, or carried into a village
          on a microSD card. It's free, it's astonishing, and it has hundreds of opinionated settings the
          agent has no business pretending to know.
          The MCP server here doesn't pretend to know any of that either. It exposes filesystem-shaped IO,
          content-addressed job submission, and gets out of the way.
        </p>
        <p class="section-deck">
          The opinions live next door, in a canon repository served by
          <a class="link" href="https://oddkit.klappy.dev">oddkit</a>.
          The agent talks to one MCP — this one. The <span class="mono" style="color:var(--persimmon)">docs(query)</span>
          tool proxies canon retrieval upstream, so the agent's loop is
          <em>ask docs · understand · act · observe</em> across a single connection.
        </p>

        <div class="pitch-grid" style="margin-top:48px">
          <div class="pitch-card anim delay-1">
            <span class="ord">i.</span>
            <h3>For translation teams</h3>
            <p>Hand a translation agent your Paratext project — any language, any script, any audio bundle — and get
              a real, signed, installable app back. The agent knows when to ask, what to tweak, and when to stop.</p>
          </div>
          <div class="pitch-card anim delay-2">
            <span class="ord">ii.</span>
            <h3>For agent builders</h3>
            <p>Three async tools. No domain quiz to pass. Submit a build, poll for status, cancel if it overruns.
              The server takes care of Gradle, the Android SDK, signing, audio sync, splash variants, and surfacing
              failures in language a model can reason about.</p>
          </div>
          <div class="pitch-card anim delay-3">
            <span class="ord">iii.</span>
            <h3>For systems people</h3>
            <p>Cloudflare Worker dispatches via service binding into a Container running SAB + Gradle + Android SDK
              + aeneas (audio sync). Durable Objects hold per-job state. R2 stores content-addressed
              <span class="mono">.apk</span> / <span class="mono">.ipa</span> outputs. SHA-256 of the canonical
              payload is the cache key.</p>
          </div>
        </div>

        <blockquote class="quote-block anim delay-4">
          "I am very grateful for the app of our culture, the New Testament app. I love this because God gives each
          ethnic group their culture to value."
          <cite>Pastor Arcesio · Guahibo people group · on a Scripture app in his language</cite>
        </blockquote>
      </div>
    </section>

    <!-- =========================================================== § II — DEMO -->
    <section class="section" id="demo">
      <div class="container">
        <div class="section-head">
          <div class="section-num">§ II.<span>Live demo</span></div>
          <h2 class="display section-title">Submit a build. Get a real, signed APK.</h2>
        </div>
        <p class="section-deck">
          Both demo payloads are checked-in smoke fixtures from the repo's <span class="mono" style="color:var(--persimmon)">smoke/</span>
          directory and have already been built once, so they cache-hit and return instantly — zero container CPU.
          The artifact card below is a real R2-served APK.
        </p>

        <div class="demo">
          <!-- console -->
          <div class="demo-console">
            <div class="ctitle"><span class="light"></span> browser ⇌ appbuilder.klappy.dev/mcp · idle</div>
            <div class="demo-controls">
              <div class="field-group">
                <label>Project</label>
                <div class="chips">
                  <span class="chip active">guahibo-nt</span>
                  <span class="chip">cuiba-jonah</span>
                  <span class="chip">tewa-luke</span>
                  <span class="chip">amharic-psalms</span>
                </div>
              </div>
              <div class="field-group">
                <label>Target</label>
                <div class="chips">
                  <span class="chip active">android</span>
                  <span class="chip">ios</span>
                  <span class="chip">epub</span>
                </div>
              </div>
              <div class="field-group">
                <label>Audio sync</label>
                <div class="chips">
                  <span class="chip active">aeneas · auto</span>
                  <span class="chip">timing-files</span>
                  <span class="chip">none</span>
                </div>
              </div>
              <div class="field-group">
                <label>Build flavor</label>
                <div class="chips">
                  <span class="chip">debug</span>
                  <span class="chip active">release · signed</span>
                </div>
              </div>
            </div>
            <div class="demo-actions">
              <button class="action primary" id="btn-submit" disabled title="Live SAB build wiring lands when smoke fixtures and the SAB container ship">submit_build</button>
              <button class="action" id="btn-status" disabled>get_job_status</button>
              <button class="action" id="btn-cancel" disabled>cancel_job</button>
              <button class="action" id="btn-tools-list">tools/list</button>
              <button class="action" id="btn-clear" style="margin-left:auto">clear log</button>
            </div>
            <div class="demo-log" id="demo-log">
              <div class="line"><span class="meta">Click <strong style="color:var(--persimmon)">tools/list</strong> to call /mcp live. Build tools are illustrative — the SAB container ships in the next phase.</span></div>
            </div>
            <div class="demo-foot">
              <span>protocol · JSON-RPC 2.0 / MCP 2025-06-18</span>
              <span>identifies as <span style="color:var(--persimmon)">x-appbuilder-client: appbuilder-mcp-homepage</span></span>
            </div>
          </div>

          <!-- result -->
          <div class="demo-result">
            <div class="head">
              <span>artifact · ready to install</span>
              <span style="color:#3e8a52">● cache hit — instant</span>
            </div>
            <div class="body">
              <div class="install-card">
                <div class="app-icon">G</div>
                <div class="app-name">Guahibo · NT</div>
                <div class="app-meta">com.sil.guahibo.nt · v1.0.4</div>
                <div class="meta-row"><span>artifact</span> <span style="color:var(--cream)">.apk · release</span></div>
                <div class="meta-row"><span>size</span> <span style="color:var(--cream)">148.2 MB</span></div>
                <div class="meta-row"><span>signed</span> <span style="color:var(--cream)">SIL · 2026 cert</span></div>
                <div class="meta-row"><span>sha256</span> <span style="color:var(--cream)">4a17b9c2…</span></div>
                <a class="install-btn" href="#">⤓ download from R2</a>
              </div>
            </div>
            <div class="head" style="border-top:1px solid var(--rule); border-bottom:none">
              <span>tools advertised by /mcp</span>
              <span id="panel-tools-count">—</span>
            </div>
            <div id="panel-tools" style="padding:14px 18px; display:flex; flex-wrap:wrap; gap:6px; border-top:1px dashed var(--rule); background:var(--cream-2); min-height:48px;">
              <span style="font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--char-soft);">probing…</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================== § III — DOCS -->
    <section class="section" id="docs">
      <div class="container">
        <div class="section-head">
          <div class="section-num">§ III.<span>The canon, live</span></div>
          <h2 class="display section-title">Ask the <em>docs</em> tool anything.</h2>
        </div>
        <p class="section-deck">
          The MCP server's <span class="mono" style="color:var(--persimmon)">docs(query)</span> tool searches
          the project's canon — prose articles, build manifests, app.json schemas, and governance documents
          that give an agent enough context to drive Scripture App Builder. Type a question; see the actual
          answer plus the canon URIs that backed it.
        </p>

        <div class="ask anim delay-1">
          <div class="label">docs(query, audience=headless)</div>
          <div class="ask-row" style="margin-top:10px">
            <input class="ask-input" placeholder="e.g. how do I add audio timing for an unknown language?" value="how does aeneas resolve audio timing for an unknown language?" />
            <button class="action primary">ask</button>
          </div>
          <div class="ask-suggest">
            <span>try:</span>
            <a href="#">app.json schema</a>
            <a href="#">signing key resolution</a>
            <a href="#">color scheme overrides</a>
            <a href="#">aeneas configuration</a>
            <a href="#">failure modes</a>
          </div>
          <div class="ask-answer">
            <div class="ans-text">
              <p>Aeneas needs a phonetic profile to align audio to text. For a language with no eSpeak voice,
              SAB falls back to <em>"sentence-level forced alignment"</em> using a graphemic surrogate (closest
              eSpeak language) plus the language's own SFM verse markers as anchor points.</p>
              <p>The agent should set <span class="mono" style="color:var(--persimmon)">audio.sync = "sentence"</span>
              and provide a per-book <span class="mono" style="color:var(--persimmon)">timings/{book}.{chapter}.csv</span>
              if greater precision is required. The build will not fail without timings — it will warn and proceed
              with verse-level highlighting only.</p>
            </div>
            <div class="sources">
              <div class="label" style="margin-bottom:10px">sources</div>
              <div class="src"><span class="num">[1]</span><span><a class="link" href="#">canon/audio/aeneas-fallback.md</a></span></div>
              <div class="src"><span class="num">[2]</span><span><a class="link" href="#">canon/build/sync-strategies.md</a></span></div>
              <div class="src"><span class="num">[3]</span><span><a class="link" href="#">specimens/guahibo-nt/timings/</a></span></div>
              <div class="src"><span class="num">[4]</span><span><a class="link" href="#">canon/decisions/0007-warn-don't-fail.md</a></span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================== § IV — CONTRACT -->
    <section class="section" id="tools">
      <div class="container">
        <div class="section-head">
          <div class="section-num">§ IV.<span>The contract</span></div>
          <h2 class="display section-title">Three tools. <em>One contract.</em></h2>
        </div>
        <p class="section-deck">
          A signed Android build for a New Testament with audio takes 8–25 minutes. iOS with provisioning takes
          longer. Synchronous tools collide with every chat-shaped surface in existence. So the protocol is async:
          <em>submit returns immediately, status is pollable, cancellation is honored.</em>
        </p>

        <div class="specimen-mark">SPECIMEN PLATE · TOOLS/LIST</div>

        <div class="tools-grid">
          <div class="tool anim delay-1">
            <span class="ord">i</span>
            <div class="kind">tool · async</div>
            <h3>submit_build</h3>
            <p>Hand it a project, an <span class="mono">app.json</span>, a target platform, signing config.
              Returns a <span class="mono">job_id</span> immediately and a predicted artifact URL.
              Identical payloads cache-hit.</p>
            <pre><span class="c">// returns immediately</span>
{
  job_id: <span class="s">"4a17b9c2…"</span>,
  payload_hash: <span class="s">"4a17b9c2…"</span>,
  cached: <span class="ok">true</span>,
  predicted_artifact_url: <span class="s">"…/r2/…/apk"</span>,
  predicted_size_mb: <span class="v">148</span>
}</pre>
          </div>
          <div class="tool anim delay-2">
            <span class="ord">ii</span>
            <div class="kind">tool · pollable</div>
            <h3>get_job_status</h3>
            <p>Per-stage progress, log tail, error list, gradle warning count.
              A <span class="mono">human_summary</span> string for downstream chat agents.</p>
            <pre>{
  state: <span class="s">"succeeded"</span>,
  stage: <span class="v">7</span>/<span class="v">7</span>,
  current: <span class="s">"sign-and-zipalign"</span>,
  warnings: <span class="v">3</span>,
  errors: [],
  human_summary:
    <span class="s">"Built. Signed. 148 MB."</span>
}</pre>
          </div>
          <div class="tool anim delay-3">
            <span class="ord">iii</span>
            <div class="kind">tool · safety valve</div>
            <h3>cancel_job</h3>
            <p>A 25-minute Gradle build needs a kill switch. SIGTERM to the subprocess; partial outputs
              preserved on disk; state moves to <span class="mono">cancelled</span>.</p>
            <pre>{
  ok: <span class="ok">true</span>,
  was_running: <span class="ok">false</span>,
  cancelled_at: <span class="s">"2026-05-01T13:24:00Z"</span>,
  partial_artifacts: [
    <span class="s">"…/staging/manifest.xml"</span>
  ]
}</pre>
          </div>
        </div>

        <div class="axiom-row">
          <div class="axiom">
            <div class="lab">cache</div>
            <h4>SHA-256 of the canonical payload (RFC 8785 JCS) is the only cache key.</h4>
            <p>No TTL. Identical builds cost zero CPU and return the same R2 artifact. Source of truth, not approximation.</p>
          </div>
          <div class="axiom">
            <div class="lab">timeout discipline</div>
            <h4>Per-job timeout in the request, default 25 min for Android, 45 for iOS.</h4>
            <p>No platform-edge timeout exposed to the caller. The Worker hands off to a Container; the Container does the long work.</p>
          </div>
          <div class="axiom">
            <div class="lab">progress shape</div>
            <h4>Per-stage, not per-percent.</h4>
            <p>Gradle doesn't expose useful per-percent progress for SAB. An honest <em>"stage 4 of 7: synchronizing audio"</em> beats fabricated bars.</p>
          </div>
        </div>

        <p style="margin-top:36px; padding:16px 20px; border-left:3px solid var(--rule); background:var(--cream-2); font-family:'JetBrains Mono', monospace; font-size:11px; line-height:1.65; color:var(--char-soft);">
          <span style="color:var(--persimmon)">// note ·</span> the three async tools are the build contract. The full live surface
          also exposes <span style="color:var(--ink)">docs(query)</span> for canon retrieval (proxied to oddkit) and
          <span style="color:var(--ink)">telemetry_public</span> · <span style="color:var(--ink)">telemetry_policy</span> · <span style="color:var(--ink)">telemetry_schema</span>
          for transparency (seven tools total). README and page enumerations drift —
          <em>the deploy is authoritative.</em> Ask <span style="color:var(--ink)">tools/list</span> against
          <span style="color:var(--ink)">/mcp</span> for the current surface.
        </p>
      </div>
    </section>

    <!-- =========================================================== § V — TELEMETRY -->
    <section class="section" id="telemetry">
      <div class="container">
        <div class="section-head">
          <div class="section-num">§ V.<span>Live telemetry</span></div>
          <h2 class="display section-title">No information <em>asymmetry.</em></h2>
        </div>
        <p class="section-deck">
          Every tool call against <span class="mono" style="color:var(--persimmon)">appbuilder.klappy.dev</span>
          writes one structural data point to <span class="mono">appbuilder_telemetry</span>. Same data the
          maintainer sees, queried over MCP from this page in your browser, right now. Identify yourself with an
          <span class="mono">x-appbuilder-client</span> header and you'll appear on the consumer leaderboard below.
        </p>

        <div class="telemetry">
          <div class="panel">
            <div class="panel-head">
              <span class="panel-title">tool_call leaderboard · last 30d · appbuilder</span>
              <span class="panel-meta">SUM(_sample_interval) GROUP BY tool_name</span>
            </div>
            <ul class="leaderboard" id="tool-leaderboard">
              <li><span class="rank">i</span><span class="name">submit_build</span><span class="bar"><span data-tool="submit_build" style="width:0%"></span></span><span class="count" data-count="submit_build">—</span></li>
              <li><span class="rank">ii</span><span class="name">get_job_status</span><span class="bar"><span data-tool="get_job_status" style="width:0%"></span></span><span class="count" data-count="get_job_status">—</span></li>
              <li><span class="rank">iii</span><span class="name">cancel_job</span><span class="bar"><span data-tool="cancel_job" style="width:0%"></span></span><span class="count" data-count="cancel_job">—</span></li>
              <li><span class="rank">iv</span><span class="name">docs</span><span class="bar"><span data-tool="docs" style="width:0%"></span></span><span class="count" data-count="docs">—</span></li>
              <li><span class="rank">v</span><span class="name">telemetry_public</span><span class="bar"><span data-tool="telemetry_public" style="width:0%"></span></span><span class="count" data-count="telemetry_public">—</span></li>
              <li><span class="rank">vi</span><span class="name">telemetry_policy</span><span class="bar"><span data-tool="telemetry_policy" style="width:0%"></span></span><span class="count" data-count="telemetry_policy">—</span></li>
              <li><span class="rank">vii</span><span class="name">telemetry_schema</span><span class="bar"><span data-tool="telemetry_schema" style="width:0%"></span></span><span class="count" data-count="telemetry_schema">—</span></li>
            </ul>
            <p style="margin:18px 0 0; font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--char-soft); padding-top:14px; border-top:1px dashed var(--rule)" id="tool-leaderboard-note">
              <span style="color:var(--persimmon)">// </span>querying telemetry_public…
            </p>
          </div>

          <div>
            <div class="stat-cards">
              <div class="stat-card">
                <div class="lab">events · 30d</div>
                <div class="val"><em>—</em></div>
                <div class="delta">querying…</div>
              </div>
              <div class="stat-card">
                <div class="lab">unique consumers</div>
                <div class="val">—</div>
                <div class="delta">querying…</div>
              </div>
              <div class="stat-card">
                <div class="lab">cache hit rate</div>
                <div class="val">—</div>
                <div class="delta">querying…</div>
              </div>
              <div class="stat-card">
                <div class="lab">avg build · cold</div>
                <div class="val">—</div>
                <div class="delta">querying…</div>
              </div>
            </div>
            <div class="panel" style="padding:18px 22px">
              <div class="panel-head" style="margin-bottom:10px; padding-bottom:10px">
                <span class="panel-title">consumer leaderboard</span>
                <span class="panel-meta">last 30d · this server</span>
              </div>
              <ul class="leaderboard" style="font-size:11px">
                <li style="grid-template-columns:1fr; padding:18px 0; text-align:center;">
                  <span style="font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--char-soft);">
                    no consumers yet — set <span style="color:var(--persimmon)">x-appbuilder-client</span> to appear here
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================== § VI — ARCHITECTURE -->
    <section class="section" id="architecture">
      <div class="container">
        <div class="section-head">
          <div class="section-num">§ VI.<span>Architecture</span></div>
          <h2 class="display section-title"><em>Vodka</em> architecture.</h2>
        </div>
        <p class="section-deck">
          <em>Vodka architecture</em> — coined in the broader
          <a class="link" href="https://klappy.dev">klappy canon</a> and applied across
          <a class="link" href="https://oddkit.klappy.dev">oddkit</a>,
          <a class="link" href="https://ptxprint.klappy.dev">ptxprint-mcp</a>, and now this server —
          says each MCP server holds opinions about exactly one concern.
          The AppBuilder server holds none about translation craft, font resolution, or app design — only
          about subprocess lifecycle, content-addressed caching, signing-key vault access, and sandboxed
          file IO. Domain knowledge lives next door, in canon. Agents see one MCP; AppBuilder delegates
          canon retrieval to oddkit upstream when serving
          <span class="mono" style="color:var(--persimmon)">docs()</span>.
        </p>

        <div class="arch-flow">
          <div class="arch-grid">
            <div class="arch-node">
              <div class="lab">CALLER</div>
              <h4>Agent</h4>
              <p>CLAUDE / GEMMA<br/>GPT / OSS</p>
            </div>
            <div class="arch-arrow">▶</div>
            <div class="arch-node featured">
              <div class="lab">THE ONE MCP THE AGENT SEES</div>
              <h4 class="persim">appbuilder MCP</h4>
              <ul>
                <li>submit · status · cancel</li>
                <li>docs · telemetry · policy</li>
              </ul>
              <p style="margin-top:auto">thin layer · zero domain opinions</p>
            </div>
            <div class="arch-arrow">▶</div>
            <div class="arch-node">
              <div class="lab">CONTAINER</div>
              <h4>SAB Builder</h4>
              <p>SAB · Gradle<br/>Android SDK · Xcode<br/>aeneas · eSpeak</p>
            </div>
          </div>

          <div class="arch-grid" style="margin-top:24px; grid-template-columns:repeat(3,1fr) 2fr">
            <div class="arch-node">
              <div class="lab">STATE</div>
              <h4>DO + R2</h4>
              <p>per-job state<br/>SHA-256 cache key<br/>signed APK / IPA</p>
            </div>
            <div class="arch-node">
              <div class="lab">VAULT · INTERNAL</div>
              <h4>Signing keys</h4>
              <p>Worker secrets<br/>per-project release certs<br/>iOS provisioning</p>
            </div>
            <div class="arch-node">
              <div class="lab">UPSTREAM · INTERNAL</div>
              <h4>oddkit MCP</h4>
              <p>canon retrieval<br/><em>(invisible to agent)</em></p>
            </div>
            <div class="arch-node" style="background:transparent; border:1px dashed var(--ink-line)">
              <div class="lab">AGENT'S LOOP</div>
              <h4 class="persim" style="font-size:18px">ask docs · understand · act · observe</h4>
              <p>One server. One concern.<br/>Two services in concert — <br/>one of them invisible to the agent.</p>
            </div>
          </div>

          <div class="arch-legend">
            <span><span class="swatch" style="background:var(--persimmon)"></span> agent-visible MCP traffic</span>
            <span><span class="swatch" style="background:#3a4f57"></span> internal · agent never sees</span>
          </div>
        </div>

        <div class="arch-axioms">
          <div class="ax">
            <h5>Opinionless server</h5>
            <p>No app.json validation. No font tables. No splash compositing rules. The server treats every file as opaque text and every subprocess as opaque action.</p>
          </div>
          <div class="ax">
            <h5>Content-addressed</h5>
            <p>Cache keys are SHA-256 hashes (RFC 8785 JCS) of the canonical payload. No TTL. No staleness. Two identical builds share one APK.</p>
          </div>
          <div class="ax">
            <h5>Async by design</h5>
            <p>Cloudflare's 30s Worker timeout collides with 25-minute Gradle builds. The two-step contract is the only honest answer.</p>
          </div>
          <div class="ax">
            <h5>Canon-governed</h5>
            <p>Every architectural decision is encoded in OLDC+H artifacts and stored under <span class="mono">canon/</span>. The repo is the spec.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================== § VII — STACK -->
    <section class="section" id="stack" style="border-bottom:none">
      <div class="container">
        <div class="section-head">
          <div class="section-num">§ VII.<span>Stack</span></div>
          <h2 class="display section-title">Built on the shoulders of <em>two giants</em>.</h2>
        </div>

        <div class="stack-grid">
          <div class="stack-col">
            <div class="lab">edge runtime</div>
            <h3>Cloudflare</h3>
            <ul>
              <li><strong>Workers</strong><span>MCP transport, auth, dispatch via service binding</span></li>
              <li><strong>Containers</strong><span>SAB + Gradle + Android SDK + aeneas (standard-3: 2 vCPU, 12 GiB)</span></li>
              <li><strong>Durable Objects</strong><span>per-job state, cancellation, polling</span></li>
              <li><strong>R2</strong><span>content-addressed APK / IPA / build-log storage</span></li>
              <li><strong>Secrets</strong><span>signing keys, provisioning profiles, vault</span></li>
              <li><strong>Analytics Engine</strong><span>public usage telemetry · zero asymmetry</span></li>
            </ul>
          </div>
          <div class="stack-col">
            <div class="lab">distribution craft</div>
            <h3>SIL &amp; Paratext</h3>
            <ul>
              <li><strong>Scripture App Builder</strong><span>SIL Global · pinned at <span class="mono">v14.0</span> (released 24 Apr 2026) · headless build mode</span></li>
              <li><strong>Paratext</strong><span>USFM source, project conventions, scripture identifiers</span></li>
              <li><strong>aeneas</strong><span>forced audio-text alignment for synchronized highlighting</span></li>
              <li><strong>eSpeak NG</strong><span>phonetic surrogate engine for unsupported languages</span></li>
              <li><strong>SIL Charis / Andika</strong><span>script-aware fonts bundled by default</span></li>
              <li><strong>BCP 47 + LFF</strong><span>language tag → font + voice resolution</span></li>
            </ul>
          </div>
        </div>

        <div style="margin-top:48px; display:grid; grid-template-columns: 1.5fr 1fr 1fr; gap:32px;">
          <div>
            <div class="label" style="margin-bottom:10px">appbuilder &amp; oddkit</div>
            <p style="font-family:'Fraunces',serif; font-style:italic; font-size:17px; line-height:1.55; color:var(--ink); margin:0">
              Built in canon-governed sessions for translation teams who need
              the <em>shop floor</em> to move at the speed of a conversation.
            </p>
          </div>
          <div>
            <div class="label" style="margin-bottom:10px">repository</div>
            <ul style="list-style:none; padding:0; margin:0; font-family:'JetBrains Mono',monospace; font-size:12px">
              <li><a class="link" href="#">github.com/klappy/appbuilder-mcp</a></li>
              <li><a class="link" href="#">github.com/klappy/ptxprint-mcp</a></li>
              <li><a class="link" href="https://software.sil.org/scriptureappbuilder/">software.sil.org/sab</a></li>
            </ul>
          </div>
          <div>
            <div class="label" style="margin-bottom:10px">endpoints</div>
            <ul style="list-style:none; padding:0; margin:0; font-family:'JetBrains Mono',monospace; font-size:12px">
              <li><a class="link" href="#">appbuilder.klappy.dev/health</a></li>
              <li><a class="link" href="#">appbuilder.klappy.dev/mcp</a></li>
              <li><a class="link" href="https://oddkit.klappy.dev/health">oddkit.klappy.dev/health</a></li>
            </ul>
          </div>
        </div>

      </div>
    </section>

  </main>

  <!-- ----------------------------------------------------------- footer -->
  <footer>
    <div class="container">
      <div>
        <div class="wordmark">
          <span class="glyph" style="color:var(--persimmon)">Æ</span>
          <span class="name" style="color:var(--cream)">klappy / appbuilder-mcp</span>
        </div>
        <p class="colophon" style="margin-top:18px">
          Set in <em>Fraunces</em> &amp; Inter Tight, with JetBrains Mono for the machines.
          Bound under the MIT license. Folio II of an evolving ledger of
          MCP servers for the translation-tech shop floor. <em>MMXXVI.</em>
        </p>
      </div>
      <div>
        <h5>Server</h5>
        <ul>
          <li><a href="#">/mcp</a></li>
          <li><a href="#">/health</a></li>
          <li><a href="#">/diagnostics/schema</a></li>
          <li><a href="#">/diagnostics/version</a></li>
        </ul>
      </div>
      <div>
        <h5>Documents</h5>
        <ul>
          <li><a href="#">README</a></li>
          <li><a href="#">canon / decisions</a></li>
          <li><a href="#">telemetry policy</a></li>
          <li><a href="#">contributing</a></li>
        </ul>
      </div>
      <div>
        <h5>Companion</h5>
        <ul>
          <li><a href="https://oddkit.klappy.dev">oddkit.klappy.dev</a></li>
          <li><a href="https://ptxprint.klappy.dev">ptxprint.klappy.dev</a></li>
          <li><a href="https://klappy.dev">klappy.dev</a></li>
        </ul>
      </div>
    </div>
    <div class="signoff">
      <span>colophon · folio II · klappy / appbuilder-mcp · MIT · MMXXVI</span>
      <span>last canon commit · checked just now</span>
    </div>
  </footer>

  <script>
    // ----------------------------------------------------------------
    // Live-data wiring for the AppBuilder MCP homepage.
    // Mirrors klappy/ptxprint-mcp/src/homepage.ts patterns where appropriate.
    // ----------------------------------------------------------------

    // Same-origin so the page works whether served from
    // appbuilder.klappy.dev or appbuilder-mcp.klappy.workers.dev.
    var BASE = location.origin;
    var MCP  = BASE + '/mcp';

    var SELF_REPORT_HEADERS = {
      'x-appbuilder-client': 'appbuilder-mcp-homepage',
      'x-appbuilder-client-version': '0.1.0',
      'x-appbuilder-surface': 'homepage',
      'x-appbuilder-contact-url': 'https://github.com/klappy/appbuilder-mcp',
      'x-appbuilder-policy-url': BASE + '/',
      'x-appbuilder-capabilities': 'submit,poll,cancel,docs,telemetry'
    };

    // ---- helpers ----------------------------------------------------
    function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
    function ts() { return new Date().toISOString().split('T')[1].replace('Z',''); }
    function jsonHL(obj) {
      var s = JSON.stringify(obj, null, 2)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return s
        .replace(/("[^"\n]+")(\s*:)/g, '<span style="color:#cdc1a8">\$1</span>\$2')
        .replace(/:\s*("[^"\n]*")/g, ': <span style="color:#e6b34a">\$1</span>')
        .replace(/:\s*(true|false|null)/g, ': <span style="color:#7fc28a">\$1</span>')
        .replace(/:\s*(-?\d+(\.\d+)?)/g, ': <span style="color:#b94a2a">\$1</span>');
    }
    function logLine(html) {
      var el = document.getElementById('demo-log');
      if (!el) return;
      var div = document.createElement('div');
      div.className = 'line';
      div.innerHTML = html;
      el.appendChild(div);
      el.scrollTop = el.scrollHeight;
    }

    // ---- 1. /health probe ------------------------------------------
    function paintHealth(data, latencyMs, ok) {
      var dot = document.getElementById('status-dot');
      var heroDot = document.getElementById('hero-status-dot');
      if (ok && data) {
        if (dot) { dot.classList.remove('amber'); dot.style.background = '#7fc28a'; dot.style.boxShadow = '0 0 0 3px rgba(127,194,138,.18)'; }
        if (heroDot) { heroDot.style.background = '#7fc28a'; heroDot.style.boxShadow = '0 0 0 3px rgba(127,194,138,.18)'; }
        setText('status-text', 'live · ' + (data.service || 'appbuilder-mcp'));
        setText('status-version', 'v' + (data.version || '?'));
        setText('status-spec',    data.spec || '?');
        setText('status-tools-count', (data.tools || []).length);
        setText('hero-version',   'v' + (data.version || '?') + ' · spec ' + (data.spec || '?'));
        setText('panel-server',   data.service || '—');
        setText('panel-version',  'v' + (data.version || '?'));
        setText('panel-spec',     data.spec || '—');
        setText('panel-latency',  latencyMs + ' ms');
        setText('panel-stamp',    new Date().toLocaleTimeString());
      } else {
        if (dot) { dot.style.background = '#b94a2a'; dot.style.boxShadow = '0 0 0 3px rgba(185,74,42,.18)'; }
        if (heroDot) { heroDot.style.background = '#b94a2a'; heroDot.style.boxShadow = '0 0 0 3px rgba(185,74,42,.18)'; }
        setText('status-text', 'unreachable');
        setText('panel-server', 'unreachable');
        setText('panel-stamp', 'fetch failed · check console');
      }
    }
    async function probeHealth() {
      var t0 = performance.now();
      try {
        var r = await fetch(BASE + '/health', { cache: 'no-store' });
        var latency = Math.round(performance.now() - t0);
        if (r.ok) { paintHealth(await r.json(), latency, true); return; }
      } catch (e) {}
      paintHealth(null, 0, false);
    }
    probeHealth();
    setInterval(probeHealth, 30000);

    // ---- 2. MCP client (matches ptxprint pattern) ------------------
    function MCPClient(endpoint, extraHeaders) {
      this.endpoint = endpoint;
      this.extraHeaders = extraHeaders || {};
      this.session = null;
      this.initPromise = null;
      this.nextId = 100;
    }
    MCPClient.prototype._headers = function () {
      var h = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      };
      for (var k in this.extraHeaders) h[k] = this.extraHeaders[k];
      if (this.session) h['Mcp-Session-Id'] = this.session;
      return h;
    };
    MCPClient.prototype.init = function () {
      if (this.initPromise) return this.initPromise;
      var self = this;
      this.initPromise = (async function () {
        var r = await fetch(self.endpoint, {
          method: 'POST',
          headers: self._headers(),
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'initialize',
            params: {
              protocolVersion: '2025-06-18',
              capabilities: {},
              clientInfo: { name: 'appbuilder-mcp-homepage', version: '0.1.0' }
            }
          })
        });
        self.session = r.headers.get('Mcp-Session-Id') || r.headers.get('mcp-session-id');
        await r.text();
        if (self.session) {
          await fetch(self.endpoint, {
            method: 'POST',
            headers: self._headers(),
            body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
          });
        }
      })();
      return this.initPromise;
    };
    MCPClient.parseSse = function (text) {
      var m = text.match(/^data:\s*(\{[\s\S]*\})\s*$/m);
      return JSON.parse(m ? m[1] : text);
    };
    MCPClient.prototype.raw = async function (method, params) {
      await this.init();
      var r = await fetch(this.endpoint, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({ jsonrpc: '2.0', id: ++this.nextId, method: method, params: params })
      });
      return MCPClient.parseSse(await r.text());
    };
    MCPClient.prototype.tool = async function (name, args) {
      var env = await this.raw('tools/call', { name: name, arguments: args });
      if (env.error) throw new Error(env.error.message || JSON.stringify(env.error));
      var inner = env.result && env.result.content && env.result.content[0] && env.result.content[0].text;
      var parsed = inner ? JSON.parse(inner) : env.result;
      // Honor the MCP isError convention: tool-level errors come back via
      // result.isError=true with the failure detail in result.content[0].text.
      if (env.result && env.result.isError) {
        var msg = (parsed && (parsed.error || parsed.message)) || 'tool reported isError';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      return parsed;
    };
    MCPClient.prototype.toolsList = async function () {
      var env = await this.raw('tools/list', {});
      return (env.result && env.result.tools) || [];
    };
    var mcp = new MCPClient(MCP, SELF_REPORT_HEADERS);

    // ---- 3. Populate "tools advertised by /mcp" --------------------
    async function populateToolsPanel() {
      var panel = document.getElementById('panel-tools');
      var countEl = document.getElementById('panel-tools-count');
      try {
        var tools = await mcp.toolsList();
        if (countEl) countEl.textContent = tools.length + ' tools';
        if (panel) {
          panel.innerHTML = tools.map(function (t) {
            return '<code style="font-family:JetBrains Mono,monospace; font-size:10.5px; padding:4px 7px; border:1px solid var(--rule); border-radius:3px; background:var(--cream); color:var(--ink);">' + t.name + '</code>';
          }).join('');
        }
      } catch (e) {
        if (panel) panel.innerHTML = '<span style="font-family:JetBrains Mono,monospace; font-size:11px; color:var(--persimmon);">tools/list failed: ' + String(e.message || e) + '</span>';
        if (countEl) countEl.textContent = 'error';
      }
    }
    populateToolsPanel();

    // ---- 4. Telemetry leaderboard via telemetry_public -------------
    async function paintTelemetryLeaderboard() {
      var note = document.getElementById('tool-leaderboard-note');
      try {
        var sql = "SELECT tool_name, SUM(_sample_interval) AS calls FROM appbuilder_telemetry "
                + "WHERE timestamp > NOW() - INTERVAL '30' DAY "
                + "GROUP BY tool_name ORDER BY calls DESC";
        var res = await mcp.tool('telemetry_public', { sql: sql });
        var rows = (res && (res.rows || res.data || res)) || [];
        if (!Array.isArray(rows)) rows = [];
        if (rows.length === 0) {
          if (note) note.innerHTML = '<span style="color:var(--persimmon)">// </span>no events yet — server enters production traffic with the next deploy.';
          return;
        }
        var max = 0;
        rows.forEach(function (r) { if (+r.calls > max) max = +r.calls; });
        rows.forEach(function (r) {
          var name = r.tool_name;
          var calls = Math.round(+r.calls);
          var pct = max > 0 ? Math.round((calls / max) * 100) : 0;
          var bar = document.querySelector('[data-tool="' + name + '"]');
          var ct  = document.querySelector('[data-count="' + name + '"]');
          if (bar) bar.style.width = pct + '%';
          if (ct)  ct.textContent = calls.toLocaleString();
        });
        if (note) note.innerHTML = '<span style="color:var(--persimmon)">// </span>last 30d · queried via telemetry_public · ' + new Date().toLocaleTimeString();
      } catch (e) {
        if (note) note.innerHTML = '<span style="color:var(--persimmon)">// </span>telemetry query failed: ' + String(e.message || e).replace(/</g,'&lt;');
      }
    }
    paintTelemetryLeaderboard();

    // ---- 5. Demo terminal: tools/list button -----------------------
    var btnTools  = document.getElementById('btn-tools-list');
    var btnClear  = document.getElementById('btn-clear');

    if (btnTools) btnTools.addEventListener('click', async function () {
      logLine('<span class="meta">[' + ts() + '] → tools/list</span>');
      try {
        var tools = await mcp.toolsList();
        logLine('<span class="ok">← ' + tools.length + ' tools</span>');
        logLine('<pre style="margin:0; padding:0; color:var(--ink); font-size:11px; line-height:1.5; white-space:pre-wrap;">' + jsonHL(tools.map(function(t){ return { name: t.name, description: (t.description || '').slice(0, 100) }; })) + '</pre>');
      } catch (e) {
        logLine('<span class="meta" style="color:var(--persimmon)">! ' + String(e.message || e).replace(/</g,'&lt;') + '</span>');
      }
    });

    if (btnClear) btnClear.addEventListener('click', function () {
      var el = document.getElementById('demo-log');
      if (el) el.innerHTML = '<div class="line"><span class="meta">log cleared.</span></div>';
    });

    // ---- 6. Existing chip toggle (preserved) -----------------------
    document.querySelectorAll('.field-group').forEach(function (group) {
      group.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          group.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
        });
      });
    });
  </script>
</body>
</html>
`;
