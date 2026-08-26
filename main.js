(function() {
    'use strict';

    const BASE_URL = 'https://ludovanschingen-jpg.github.io/AnphiUltimate';
    const WHITELIST_URL = `${BASE_URL}/whitelist.json`;
    const DISCORD_INVITE = 'https://discord.gg/54xUGVpxeb';
    const VERSION = '2.3.0';
    
    const TABS_CONFIG = [
        { id: 'info', name: 'Info', icon: '📢', script: 'tabs/info.js' },
        { id: 'farm', name: 'Farm', icon: '🌾', script: 'tabs/farm.js' },
        { id: 'autocamp', name: 'AutoCamp', icon: '🎯', script: 'tabs/autocamp.js' },
        { id: 'build', name: 'Build', icon: '🏗️', script: 'tabs/build.js' },
        { id: 'recruit', name: 'Recruit', icon: '⚔️', script: 'tabs/recruit.js' },
        { id: 'naval', name: 'Naval', icon: '⚓', script: 'tabs/naval.js' },
        { id: 'culture', name: 'Culture', icon: '🎭', script: 'tabs/culture.js' },
        { id: 'calage', name: 'Calage', icon: '⏱️', script: 'tabs/calage.js' },
        { id: 'commerce', name: 'Commerce', icon: '🏪', script: 'tabs/commerce.js' },
        { id: 'dodge', name: 'Dodge', icon: '🛡️', script: 'tabs/dodge.js', disabled: true },
        { id: 'settings', name: 'Parametres', icon: '⚙️', script: 'tabs/settings.js' }
    ];

    var uw = (typeof unsafeWindow == 'undefined') ? window : unsafeWindow;
    const loadedTabs = {};
    let currentTab = 'info';
    let panelOpen = false;
    let logs = [];
    let userAccess = null;
    let whitelistData = null;

    function getPlayerName() { try { return uw.Game.player_name || 'Inconnu'; } catch(e) { return 'Inconnu'; } }
    function getWorldName() { try { return uw.Game.world_id || window.location.hostname.split('.')[0] || 'Inconnu'; } catch(e) { return 'Inconnu'; } }
    function getPlayerId() { try { return uw.Game.player_id || 0; } catch(e) { return 0; } }

    GM_addStyle(`/*! tailwindcss v4.3.0 | MIT License | https://tailwindcss.com */@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-space-y-reverse:0;--tw-space-x-reverse:0;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-tracking:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial;--tw-duration:initial;--tw-animation-delay:0s;--tw-animation-direction:normal;--tw-animation-duration:initial;--tw-animation-fill-mode:none;--tw-animation-iteration-count:1;--tw-enter-blur:0;--tw-enter-opacity:1;--tw-enter-rotate:0;--tw-enter-scale:1;--tw-enter-translate-x:0;--tw-enter-translate-y:0;--tw-exit-blur:0;--tw-exit-opacity:1;--tw-exit-rotate:0;--tw-exit-scale:1;--tw-exit-translate-x:0;--tw-exit-translate-y:0}}}@layer theme{:root,:host{--font-sans:ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";--font-mono:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;--color-red-100:oklch(93.6% .032 17.717);--color-red-500:oklch(63.7% .237 25.331);--color-red-600:oklch(57.7% .245 27.325);--color-red-700:oklch(50.5% .213 27.518);--color-red-800:oklch(44.4% .177 26.899);--color-red-900:oklch(39.6% .141 25.723);--color-orange-500:oklch(70.5% .213 47.604);--color-orange-700:oklch(55.3% .195 38.402);--color-amber-100:oklch(96.2% .059 95.617);--color-amber-200:oklch(92.4% .12 95.746);--color-amber-500:oklch(76.9% .188 70.08);--color-amber-700:oklch(55.5% .163 48.998);--color-amber-800:oklch(47.3% .137 46.201);--color-amber-900:oklch(41.4% .112 45.904);--color-amber-950:oklch(27.9% .077 45.635);--color-yellow-300:oklch(90.5% .182 98.111);--color-yellow-400:oklch(85.2% .199 91.936);--color-yellow-500:oklch(79.5% .184 86.047);--color-yellow-600:oklch(68.1% .162 75.834);--color-yellow-700:oklch(55.4% .135 66.442);--color-yellow-900:oklch(42.1% .095 57.708);--color-green-100:oklch(96.2% .044 156.743);--color-green-500:oklch(72.3% .219 149.579);--color-green-600:oklch(62.7% .194 149.214);--color-green-700:oklch(52.7% .154 150.069);--color-green-800:oklch(44.8% .119 151.328);--color-emerald-100:oklch(95% .052 163.051);--color-emerald-800:oklch(43.2% .095 166.913);--color-emerald-950:oklch(26.2% .051 172.552);--color-sky-100:oklch(95.1% .026 236.824);--color-sky-800:oklch(44.3% .11 240.79);--color-sky-950:oklch(29.3% .066 243.157);--color-blue-400:oklch(70.7% .165 254.624);--color-blue-500:oklch(62.3% .214 259.815);--color-blue-600:oklch(54.6% .245 262.881);--color-gray-300:oklch(87.2% .01 258.338);--color-gray-400:oklch(70.7% .022 261.325);--color-gray-500:oklch(55.1% .027 264.364);--color-gray-600:oklch(44.6% .03 256.802);--color-gray-700:oklch(37.3% .034 259.733);--color-gray-800:oklch(27.8% .033 256.848);--color-black:#000;--color-white:#fff;--spacing:.25rem;--container-lg:32rem;--container-3xl:48rem;--text-xs:.75rem;--text-xs--line-height:calc(1 / .75);--text-sm:.875rem;--text-sm--line-height:calc(1.25 / .875);--text-base:1rem;--text-base--line-height: 1.5 ;--text-lg:1.125rem;--text-lg--line-height:calc(1.75 / 1.125);--text-xl:1.25rem;--text-xl--line-height:calc(1.75 / 1.25);--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--tracking-widest:.1em;--leading-snug:1.375;--leading-relaxed:1.625;--radius-xs:.125rem;--animate-spin:spin 1s linear infinite;--animate-pulse:pulse 2s cubic-bezier(.4, 0, .6, 1) infinite;--blur-sm:8px;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono)}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring{outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab,red,red)){::placeholder{color:color-mix(in oklab,currentcolor 50%,transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}*{border-color:var(--border);outline-color:var(--ring)}@supports (color:color-mix(in lab,red,red)){*{outline-color:color-mix(in oklab,var(--ring) 50%,transparent)}}body{background-color:var(--background);color:var(--foreground)}}@layer components;@layer utilities{.\@container\/card-header{container:card-header/inline-size}.pointer-events-none{pointer-events:none}.collapse{visibility:collapse}.visible{visibility:visible}.sr-only{clip-path:inset(50%);white-space:nowrap;border-width:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.static{position:static}.sticky{position:sticky}.inset-0{inset:calc(var(--spacing) * 0)}.-top-1{top:calc(var(--spacing) * -1)}.top-0{top:calc(var(--spacing) * 0)}.top-1{top:calc(var(--spacing) * 1)}.top-4{top:calc(var(--spacing) * 4)}.top-\[50\%\]{top:50%}.top-px{top:1px}.-right-1{right:calc(var(--spacing) * -1)}.right-4{right:calc(var(--spacing) * 4)}.right-px{right:1px}.bottom-px{bottom:1px}.left-0{left:calc(var(--spacing) * 0)}.left-1{left:calc(var(--spacing) * 1)}.left-\[50\%\]{left:50%}.left-px{left:1px}.z-\[7008\]{z-index:7008}.z-\[7009\]{z-index:7009}.z-\[7010\]{z-index:7010}.col-span-full{grid-column:1/-1}.col-start-2{grid-column-start:2}.row-span-2{grid-row:span 2/span 2}.row-start-1{grid-row-start:1}.container{width:100%}@media (min-width:40rem){.container{max-width:40rem}}@media (min-width:48rem){.container{max-width:48rem}}@media (min-width:64rem){.container{max-width:64rem}}@media (min-width:80rem){.container{max-width:80rem}}@media (min-width:96rem){.container{max-width:96rem}}.-mx-1{margin-inline:calc(var(--spacing) * -1)}.mx-12{margin-inline:calc(var(--spacing) * 12)}.my-2{margin-block:calc(var(--spacing) * 2)}.mt-1{margin-top:calc(var(--spacing) * 1)}.mt-2{margin-top:calc(var(--spacing) * 2)}.mt-3{margin-top:calc(var(--spacing) * 3)}.mr-1{margin-right:calc(var(--spacing) * 1)}.mr-2{margin-right:calc(var(--spacing) * 2)}.mb-1{margin-bottom:calc(var(--spacing) * 1)}.mb-2{margin-bottom:calc(var(--spacing) * 2)}.mb-4{margin-bottom:calc(var(--spacing) * 4)}.ml-2{margin-left:calc(var(--spacing) * 2)}.ml-6{margin-left:calc(var(--spacing) * 6)}.ml-auto{margin-left:auto}.box-border{box-sizing:border-box}.block{display:block}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline{display:inline}.inline-block{display:inline-block}.inline-flex{display:inline-flex}.table{display:table}.size-4{width:calc(var(--spacing) * 4);height:calc(var(--spacing) * 4)}.size-5{width:calc(var(--spacing) * 5);height:calc(var(--spacing) * 5)}.size-6{width:calc(var(--spacing) * 6);height:calc(var(--spacing) * 6)}.size-9{width:calc(var(--spacing) * 9);height:calc(var(--spacing) * 9)}.h-3{height:calc(var(--spacing) * 3)}.h-4{height:calc(var(--spacing) * 4)}.h-5{height:calc(var(--spacing) * 5)}.h-6{height:calc(var(--spacing) * 6)}.h-8{height:calc(var(--spacing) * 8)}.h-9{height:calc(var(--spacing) * 9)}.h-10{height:calc(var(--spacing) * 10)}.h-12{height:calc(var(--spacing) * 12)}.h-16{height:calc(var(--spacing) * 16)}.h-60{height:calc(var(--spacing) * 60)}.h-\[1\.15rem\]{height:1.15rem}.h-\[50px\]{height:50px}.h-\[68px\]{height:68px}.h-\[81px\]{height:81px}.h-\[200px\]{height:200px}.h-full{height:100%}.h-px{height:1px}.max-h-52{max-height:calc(var(--spacing) * 52)}.max-h-\[300px\]{max-height:300px}.min-h-0{min-height:calc(var(--spacing) * 0)}.w-2\/3{width:66.6667%}.w-3{width:calc(var(--spacing) * 3)}.w-4{width:calc(var(--spacing) * 4)}.w-5{width:calc(var(--spacing) * 5)}.w-6{width:calc(var(--spacing) * 6)}.w-7{width:calc(var(--spacing) * 7)}.w-8{width:calc(var(--spacing) * 8)}.w-9{width:calc(var(--spacing) * 9)}.w-10{width:calc(var(--spacing) * 10)}.w-12{width:calc(var(--spacing) * 12)}.w-16{width:calc(var(--spacing) * 16)}.w-20{width:calc(var(--spacing) * 20)}.w-32{width:calc(var(--spacing) * 32)}.w-60{width:calc(var(--spacing) * 60)}.w-72{width:calc(var(--spacing) * 72)}.w-80{width:calc(var(--spacing) * 80)}.w-120{width:calc(var(--spacing) * 120)}.w-\[--radix-popover-trigger-width\]{width:--radix-popover-trigger-width}.w-\[50px\]{width:50px}.w-\[67px\]{width:67px}.w-\[80px\]{width:80px}.w-\[115px\]{width:115px}.w-\[120px\]{width:120px}.w-\[205px\]{width:205px}.w-fit{width:fit-content}.w-full{width:100%}.max-w-3xl{max-width:var(--container-3xl)}.max-w-\[50\%\]{max-width:50%}.max-w-\[calc\(100\%-2rem\)\]{max-width:calc(100% - 2rem)}.min-w-0{min-width:calc(var(--spacing) * 0)}.min-w-6{min-width:calc(var(--spacing) * 6)}.min-w-28{min-width:calc(var(--spacing) * 28)}.min-w-32{min-width:calc(var(--spacing) * 32)}.min-w-52{min-width:calc(var(--spacing) * 52)}.flex-1{flex:1}.flex-shrink-0,.shrink-0{flex-shrink:0}.flex-grow,.grow{flex-grow:1}.origin-\[var\(--radix-popover-content-transform-origin\)\]{transform-origin:var(--radix-popover-content-transform-origin)}.origin-top-left{transform-origin:0 0}.translate-x-\[-50\%\]{--tw-translate-x:-50%;translate:var(--tw-translate-x) var(--tw-translate-y)}.translate-y-\[-50\%\]{--tw-translate-y:-50%;translate:var(--tw-translate-x) var(--tw-translate-y)}.scale-\[1\.15\]{scale:1.15}.scale-\[1\.38\]{scale:1.38}.transform{transform:var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,)}.animate-pulse{animation:var(--animate-pulse)}.animate-spin{animation:var(--animate-spin)}.cursor-default{cursor:default}.cursor-grab{cursor:grab}.cursor-not-allowed{cursor:not-allowed}.cursor-pointer{cursor:pointer}.cursor-text{cursor:text}.resize{resize:both}.scroll-py-1{scroll-padding-block:calc(var(--spacing) * 1)}.list-disc{list-style-type:disc}.appearance-none{appearance:none}.auto-rows-min{grid-auto-rows:min-content}.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.grid-cols-\[1fr_auto\]{grid-template-columns:1fr auto}.grid-cols-\[1rem_5rem_1fr_auto\]{grid-template-columns:1rem 5rem 1fr auto}.grid-cols-\[180px_minmax\(0\,1fr\)\]{grid-template-columns:180px minmax(0,1fr)}.grid-cols-\[auto_1fr_1fr_auto\]{grid-template-columns:auto 1fr 1fr auto}.grid-rows-\[auto_auto\]{grid-template-rows:auto auto}.flex-col{flex-direction:column}.flex-col-reverse{flex-direction:column-reverse}.flex-row{flex-direction:row}.flex-nowrap{flex-wrap:nowrap}.flex-wrap{flex-wrap:wrap}.items-baseline{align-items:baseline}.items-center{align-items:center}.items-end{align-items:flex-end}.items-start{align-items:flex-start}.items-stretch{align-items:stretch}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.justify-evenly{justify-content:space-evenly}.gap-0\.5{gap:calc(var(--spacing) * .5)}.gap-1{gap:calc(var(--spacing) * 1)}.gap-1\.5{gap:calc(var(--spacing) * 1.5)}.gap-2{gap:calc(var(--spacing) * 2)}.gap-3{gap:calc(var(--spacing) * 3)}.gap-4{gap:calc(var(--spacing) * 4)}.gap-6{gap:calc(var(--spacing) * 6)}:where(.space-y-1>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 1) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-1\.5>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 1.5) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 1.5) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-2>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 2) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 2) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-3>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 3) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 3) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-x-2>:not(:last-child)){--tw-space-x-reverse:0;margin-inline-start:calc(calc(var(--spacing) * 2) * var(--tw-space-x-reverse));margin-inline-end:calc(calc(var(--spacing) * 2) * calc(1 - var(--tw-space-x-reverse)))}.self-start{align-self:flex-start}.justify-self-end{justify-self:flex-end}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-auto{overflow:auto}.overflow-hidden{overflow:hidden}.overflow-x-hidden{overflow-x:hidden}.overflow-y-auto{overflow-y:auto}.overflow-y-clip{overflow-y:clip}.rounded{border-radius:.25rem}.rounded-full{border-radius:3.40282e38px}.rounded-lg{border-radius:var(--radius)}.rounded-md{border-radius:calc(var(--radius) - 2px)}.rounded-sm{border-radius:calc(var(--radius) - 4px)}.rounded-xl{border-radius:calc(var(--radius) + 4px)}.rounded-xs{border-radius:var(--radius-xs)}.border{border-style:var(--tw-border-style);border-width:1px}.border-2{border-style:var(--tw-border-style);border-width:2px}.border-4{border-style:var(--tw-border-style);border-width:4px}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-l{border-left-style:var(--tw-border-style);border-left-width:1px}.border-dashed{--tw-border-style:dashed;border-style:dashed}.border-\[\#4f8f55\]{border-color:#4f8f55}.border-\[\#6b3f15\]{border-color:#6b3f15}.border-\[\#7a1c1c\]{border-color:#7a1c1c}.border-\[\#7b5a28\]{border-color:#7b5a28}.border-\[\#7f352c\]{border-color:#7f352c}.border-\[\#8a6a35\]{border-color:#8a6a35}.border-\[\#8a6a35\]\/70{border-color:#8a6a35b3}.border-\[\#8b6f3d\]{border-color:#8b6f3d}.border-\[\#8f6b3d\]{border-color:#8f6b3d}.border-\[\#9b7a42\]{border-color:#9b7a42}.border-\[\#9b7a48\]{border-color:#9b7a48}.border-\[\#47714a\]{border-color:#47714a}.border-\[\#71502d\]{border-color:#71502d}.border-\[\#a18452\]{border-color:#a18452}.border-amber-500\/60{border-color:#f99c0099}@supports (color:color-mix(in lab,red,red)){.border-amber-500\/60{border-color:color-mix(in oklab,var(--color-amber-500) 60%,transparent)}}.border-amber-700{border-color:var(--color-amber-700)}.border-amber-800{border-color:var(--color-amber-800)}.border-black\/10{border-color:#0000001a}@supports (color:color-mix(in lab,red,red)){.border-black\/10{border-color:color-mix(in oklab,var(--color-black) 10%,transparent)}}.border-black\/20{border-color:#0003}@supports (color:color-mix(in lab,red,red)){.border-black\/20{border-color:color-mix(in oklab,var(--color-black) 20%,transparent)}}.border-black\/30{border-color:#0000004d}@supports (color:color-mix(in lab,red,red)){.border-black\/30{border-color:color-mix(in oklab,var(--color-black) 30%,transparent)}}.border-blue-500{border-color:var(--color-blue-500)}.border-current{border-color:currentColor}.border-emerald-800{border-color:var(--color-emerald-800)}.border-gray-400{border-color:var(--color-gray-400)}.border-gray-500{border-color:var(--color-gray-500)}.border-gray-500\/40{border-color:#6a728266}@supports (color:color-mix(in lab,red,red)){.border-gray-500\/40{border-color:color-mix(in oklab,var(--color-gray-500) 40%,transparent)}}.border-gray-600{border-color:var(--color-gray-600)}.border-green-700{border-color:var(--color-green-700)}.border-input{border-color:var(--input)}.border-orange-500{border-color:var(--color-orange-500)}.border-red-700{border-color:var(--color-red-700)}.border-red-900{border-color:var(--color-red-900)}.border-red-900\/60{border-color:#82181a99}@supports (color:color-mix(in lab,red,red)){.border-red-900\/60{border-color:color-mix(in oklab,var(--color-red-900) 60%,transparent)}}.border-sky-800{border-color:var(--color-sky-800)}.border-transparent{border-color:#0000}.border-white\/30{border-color:#ffffff4d}@supports (color:color-mix(in lab,red,red)){.border-white\/30{border-color:color-mix(in oklab,var(--color-white) 30%,transparent)}}.border-yellow-400{border-color:var(--color-yellow-400)}.border-yellow-400\/80{border-color:#fac800cc}@supports (color:color-mix(in lab,red,red)){.border-yellow-400\/80{border-color:color-mix(in oklab,var(--color-yellow-400) 80%,transparent)}}.border-yellow-500{border-color:var(--color-yellow-500)}.border-yellow-600{border-color:var(--color-yellow-600)}.border-t-transparent{border-top-color:#0000}.bg-\[\#6b9a65\]{background-color:#6b9a65}.bg-\[\#28649a\]{background-color:#28649a}.bg-\[\#c96b59\]{background-color:#c96b59}.bg-\[\#d8ebbc\]{background-color:#d8ebbc}.bg-\[\#d86a50\]{background-color:#d86a50}.bg-\[\#e4c789\]{background-color:#e4c789}.bg-\[\#e9d59b\]{background-color:#e9d59b}.bg-\[\#ead79f\]{background-color:#ead79f}.bg-\[\#f4dfb5\]{background-color:#f4dfb5}.bg-\[\#f5e9c5\]{background-color:#f5e9c5}.bg-\[\#f8e7bd\]\/80{background-color:#f8e7bdcc}.bg-\[\#f8e7bd\]\/85{background-color:#f8e7bdd9}.bg-\[\#f8ecd0\]{background-color:#f8ecd0}.bg-amber-100{background-color:var(--color-amber-100)}.bg-amber-200{background-color:var(--color-amber-200)}.bg-background{background-color:var(--background)}.bg-black\/5{background-color:#0000000d}@supports (color:color-mix(in lab,red,red)){.bg-black\/5{background-color:color-mix(in oklab,var(--color-black) 5%,transparent)}}.bg-black\/10{background-color:#0000001a}@supports (color:color-mix(in lab,red,red)){.bg-black\/10{background-color:color-mix(in oklab,var(--color-black) 10%,transparent)}}.bg-black\/30{background-color:#0000004d}@supports (color:color-mix(in lab,red,red)){.bg-black\/30{background-color:color-mix(in oklab,var(--color-black) 30%,transparent)}}.bg-black\/40{background-color:#0006}@supports (color:color-mix(in lab,red,red)){.bg-black\/40{background-color:color-mix(in oklab,var(--color-black) 40%,transparent)}}.bg-black\/50{background-color:#00000080}@supports (color:color-mix(in lab,red,red)){.bg-black\/50{background-color:color-mix(in oklab,var(--color-black) 50%,transparent)}}.bg-black\/60{background-color:#0009}@supports (color:color-mix(in lab,red,red)){.bg-black\/60{background-color:color-mix(in oklab,var(--color-black) 60%,transparent)}}.bg-black\/\[0\.03\]{background-color:#00000008}@supports (color:color-mix(in lab,red,red)){.bg-black\/\[0\.03\]{background-color:color-mix(in oklab,var(--color-black) 3%,transparent)}}.bg-blue-500{background-color:var(--color-blue-500)}.bg-border{background-color:var(--border)}.bg-card{background-color:var(--card)}.bg-destructive{background-color:var(--destructive)}.bg-emerald-100{background-color:var(--color-emerald-100)}.bg-green-100\/60{background-color:#dcfce799}@supports (color:color-mix(in lab,red,red)){.bg-green-100\/60{background-color:color-mix(in oklab,var(--color-green-100) 60%,transparent)}}.bg-green-600\/80{background-color:#00a544cc}@supports (color:color-mix(in lab,red,red)){.bg-green-600\/80{background-color:color-mix(in oklab,var(--color-green-600) 80%,transparent)}}.bg-green-700{background-color:var(--color-green-700)}.bg-green-700\/80{background-color:#008138cc}@supports (color:color-mix(in lab,red,red)){.bg-green-700\/80{background-color:color-mix(in oklab,var(--color-green-700) 80%,transparent)}}.bg-popover{background-color:var(--popover)}.bg-primary{background-color:var(--primary)}.bg-red-100\/60{background-color:#ffe2e299}@supports (color:color-mix(in lab,red,red)){.bg-red-100\/60{background-color:color-mix(in oklab,var(--color-red-100) 60%,transparent)}}.bg-red-700{background-color:var(--color-red-700)}.bg-red-900\/30{background-color:#82181a4d}@supports (color:color-mix(in lab,red,red)){.bg-red-900\/30{background-color:color-mix(in oklab,var(--color-red-900) 30%,transparent)}}.bg-secondary{background-color:var(--secondary)}.bg-sky-100{background-color:var(--color-sky-100)}.bg-transparent{background-color:#0000}.bg-white\/10{background-color:#ffffff1a}@supports (color:color-mix(in lab,red,red)){.bg-white\/10{background-color:color-mix(in oklab,var(--color-white) 10%,transparent)}}.bg-white\/20{background-color:#fff3}@supports (color:color-mix(in lab,red,red)){.bg-white\/20{background-color:color-mix(in oklab,var(--color-white) 20%,transparent)}}.bg-white\/25{background-color:#ffffff40}@supports (color:color-mix(in lab,red,red)){.bg-white\/25{background-color:color-mix(in oklab,var(--color-white) 25%,transparent)}}.bg-white\/30{background-color:#ffffff4d}@supports (color:color-mix(in lab,red,red)){.bg-white\/30{background-color:color-mix(in oklab,var(--color-white) 30%,transparent)}}.bg-white\/80{background-color:#fffc}@supports (color:color-mix(in lab,red,red)){.bg-white\/80{background-color:color-mix(in oklab,var(--color-white) 80%,transparent)}}.bg-yellow-400{background-color:var(--color-yellow-400)}.bg-yellow-500\/10{background-color:#edb2001a}@supports (color:color-mix(in lab,red,red)){.bg-yellow-500\/10{background-color:color-mix(in oklab,var(--color-yellow-500) 10%,transparent)}}.bg-yellow-600\/40{background-color:#cd890066}@supports (color:color-mix(in lab,red,red)){.bg-yellow-600\/40{background-color:color-mix(in oklab,var(--color-yellow-600) 40%,transparent)}}.bg-yellow-700\/50{background-color:#a3610080}@supports (color:color-mix(in lab,red,red)){.bg-yellow-700\/50{background-color:color-mix(in oklab,var(--color-yellow-700) 50%,transparent)}}.bg-yellow-900\/40{background-color:#733e0a66}@supports (color:color-mix(in lab,red,red)){.bg-yellow-900\/40{background-color:color-mix(in oklab,var(--color-yellow-900) 40%,transparent)}}.bg-cover{background-size:cover}.bg-center{background-position:50%}.p-0{padding:calc(var(--spacing) * 0)}.p-1{padding:calc(var(--spacing) * 1)}.p-2{padding:calc(var(--spacing) * 2)}.p-3{padding:calc(var(--spacing) * 3)}.p-4{padding:calc(var(--spacing) * 4)}.p-6{padding:calc(var(--spacing) * 6)}.p-8{padding:calc(var(--spacing) * 8)}.px-1{padding-inline:calc(var(--spacing) * 1)}.px-1\.5{padding-inline:calc(var(--spacing) * 1.5)}.px-2{padding-inline:calc(var(--spacing) * 2)}.px-3{padding-inline:calc(var(--spacing) * 3)}.px-4{padding-inline:calc(var(--spacing) * 4)}.px-6{padding-inline:calc(var(--spacing) * 6)}.py-0\.5{padding-block:calc(var(--spacing) * .5)}.py-1{padding-block:calc(var(--spacing) * 1)}.py-1\.5{padding-block:calc(var(--spacing) * 1.5)}.py-2{padding-block:calc(var(--spacing) * 2)}.py-3{padding-block:calc(var(--spacing) * 3)}.py-6{padding-block:calc(var(--spacing) * 6)}.pt-2{padding-top:calc(var(--spacing) * 2)}.pr-1{padding-right:calc(var(--spacing) * 1)}.pr-2{padding-right:calc(var(--spacing) * 2)}.pr-4{padding-right:calc(var(--spacing) * 4)}.pb-2{padding-bottom:calc(var(--spacing) * 2)}.pl-2{padding-left:calc(var(--spacing) * 2)}.pl-3{padding-left:calc(var(--spacing) * 3)}.pl-4{padding-left:calc(var(--spacing) * 4)}.pl-6{padding-left:calc(var(--spacing) * 6)}.pl-10{padding-left:calc(var(--spacing) * 10)}.text-center{text-align:center}.text-left{text-align:left}.font-mono{font-family:var(--font-mono)}.text-base{font-size:var(--text-base);line-height:var(--tw-leading,var(--text-base--line-height))}.text-lg{font-size:var(--text-lg);line-height:var(--tw-leading,var(--text-lg--line-height))}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-xl{font-size:var(--text-xl);line-height:var(--tw-leading,var(--text-xl--line-height))}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.text-\[10px\]{font-size:10px}.text-\[11px\]{font-size:11px}.leading-none{--tw-leading:1;line-height:1}.leading-relaxed{--tw-leading:var(--leading-relaxed);line-height:var(--leading-relaxed)}.leading-snug{--tw-leading:var(--leading-snug);line-height:var(--leading-snug)}.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.tracking-widest{--tw-tracking:var(--tracking-widest);letter-spacing:var(--tracking-widest)}.whitespace-nowrap{white-space:nowrap}.whitespace-pre-wrap{white-space:pre-wrap}.text-\[\#1f160d\]{color:#1f160d}.text-\[\#2b4a22\]{color:#2b4a22}.text-\[\#2b2116\]{color:#2b2116}.text-\[\#4b3520\]{color:#4b3520}.text-\[\#6a431f\]{color:#6a431f}.text-\[\#8c1d1d\]{color:#8c1d1d}.text-amber-700{color:var(--color-amber-700)}.text-amber-800{color:var(--color-amber-800)}.text-amber-900{color:var(--color-amber-900)}.text-amber-950{color:var(--color-amber-950)}.text-black{color:var(--color-black)}.text-black\/50{color:#00000080}@supports (color:color-mix(in lab,red,red)){.text-black\/50{color:color-mix(in oklab,var(--color-black) 50%,transparent)}}.text-black\/55{color:#0000008c}@supports (color:color-mix(in lab,red,red)){.text-black\/55{color:color-mix(in oklab,var(--color-black) 55%,transparent)}}.text-black\/60{color:#0009}@supports (color:color-mix(in lab,red,red)){.text-black\/60{color:color-mix(in oklab,var(--color-black) 60%,transparent)}}.text-black\/65{color:#000000a6}@supports (color:color-mix(in lab,red,red)){.text-black\/65{color:color-mix(in oklab,var(--color-black) 65%,transparent)}}.text-black\/70{color:#000000b3}@supports (color:color-mix(in lab,red,red)){.text-black\/70{color:color-mix(in oklab,var(--color-black) 70%,transparent)}}.text-blue-600{color:var(--color-blue-600)}.text-card-foreground{color:var(--card-foreground)}.text-emerald-950{color:var(--color-emerald-950)}.text-foreground{color:var(--foreground)}.text-gray-300{color:var(--color-gray-300)}.text-gray-400{color:var(--color-gray-400)}.text-gray-500{color:var(--color-gray-500)}.text-gray-600{color:var(--color-gray-600)}.text-gray-700{color:var(--color-gray-700)}.text-gray-800{color:var(--color-gray-800)}.text-green-500{color:var(--color-green-500)}.text-green-600{color:var(--color-green-600)}.text-green-700{color:var(--color-green-700)}.text-green-800{color:var(--color-green-800)}.text-muted-foreground{color:var(--muted-foreground)}.text-orange-700{color:var(--color-orange-700)}.text-popover-foreground{color:var(--popover-foreground)}.text-primary{color:var(--primary)}.text-primary-foreground{color:var(--primary-foreground)}.text-red-500{color:var(--color-red-500)}.text-red-600{color:var(--color-red-600)}.text-red-800{color:var(--color-red-800)}.text-secondary-foreground{color:var(--secondary-foreground)}.text-sky-950{color:var(--color-sky-950)}.text-white{color:var(--color-white)}.capitalize{text-transform:capitalize}.uppercase{text-transform:uppercase}.italic{font-style:italic}.underline-offset-4{text-underline-offset:4px}.opacity-0{opacity:0}.opacity-30{opacity:.3}.opacity-45{opacity:.45}.opacity-50{opacity:.5}.opacity-60{opacity:.6}.opacity-70{opacity:.7}.opacity-80{opacity:.8}.opacity-100{opacity:1}.shadow{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-inner{--tw-shadow:inset 0 2px 4px 0 var(--tw-shadow-color,#0000000d);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px var(--tw-shadow-color,#0000001a), 0 4px 6px -4px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-md{--tw-shadow:0 4px 6px -1px var(--tw-shadow-color,#0000001a), 0 2px 4px -2px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-xs{--tw-shadow:0 1px 2px 0 var(--tw-shadow-color,#0000000d);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.ring-0{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(0px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.ring-offset-background{--tw-ring-offset-color:var(--background)}.outline{outline-style:var(--tw-outline-style);outline-width:1px}.blur{--tw-blur:blur(8px);filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.grayscale{--tw-grayscale:grayscale(100%);filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.filter{filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.backdrop-blur-sm{--tw-backdrop-blur:blur(var(--blur-sm));-webkit-backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\[color\,box-shadow\]{transition-property:color,box-shadow;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-all{transition-property:all;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-opacity{transition-property:opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.duration-200{--tw-duration:.2s;transition-duration:.2s}.duration-500{--tw-duration:.5s;transition-duration:.5s}.outline-none{--tw-outline-style:none;outline-style:none}.select-none{-webkit-user-select:none;user-select:none}.paused{animation-play-state:paused}.group-data-\[disabled\=true\]\:pointer-events-none:is(:where(.group)[data-disabled=true] *){pointer-events:none}.group-data-\[disabled\=true\]\:opacity-50:is(:where(.group)[data-disabled=true] *){opacity:.5}.peer-disabled\:cursor-not-allowed:is(:where(.peer):disabled~*){cursor:not-allowed}.peer-disabled\:opacity-50:is(:where(.peer):disabled~*){opacity:.5}.selection\:bg-primary ::selection{background-color:var(--primary)}.selection\:bg-primary::selection{background-color:var(--primary)}.selection\:text-primary-foreground ::selection{color:var(--primary-foreground)}.selection\:text-primary-foreground::selection{color:var(--primary-foreground)}.file\:inline-flex::file-selector-button{display:inline-flex}.file\:h-7::file-selector-button{height:calc(var(--spacing) * 7)}.file\:border-0::file-selector-button{border-style:var(--tw-border-style);border-width:0}.file\:bg-transparent::file-selector-button{background-color:#0000}.file\:text-sm::file-selector-button{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.file\:font-medium::file-selector-button{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.file\:text-foreground::file-selector-button{color:var(--foreground)}.placeholder\:text-muted-foreground::placeholder{color:var(--muted-foreground)}.open\:bg-\[\#fff0c9\]:is([open],:popover-open,:open){background-color:#fff0c9}@media (hover:hover){.hover\:border-white\/50:hover{border-color:#ffffff80}@supports (color:color-mix(in lab,red,red)){.hover\:border-white\/50:hover{border-color:color-mix(in oklab,var(--color-white) 50%,transparent)}}.hover\:border-yellow-300:hover{border-color:var(--color-yellow-300)}.hover\:bg-\[\#b64d3d\]:hover{background-color:#b64d3d}.hover\:bg-\[\#cbe4a8\]:hover{background-color:#cbe4a8}.hover\:bg-\[\#d8b873\]:hover{background-color:#d8b873}.hover\:bg-accent:hover{background-color:var(--accent)}.hover\:bg-black\/5:hover{background-color:#0000000d}@supports (color:color-mix(in lab,red,red)){.hover\:bg-black\/5:hover{background-color:color-mix(in oklab,var(--color-black) 5%,transparent)}}.hover\:bg-black\/40:hover{background-color:#0006}@supports (color:color-mix(in lab,red,red)){.hover\:bg-black\/40:hover{background-color:color-mix(in oklab,var(--color-black) 40%,transparent)}}.hover\:bg-blue-600:hover{background-color:var(--color-blue-600)}.hover\:bg-destructive\/90:hover{background-color:var(--destructive)}@supports (color:color-mix(in lab,red,red)){.hover\:bg-destructive\/90:hover{background-color:color-mix(in oklab,var(--destructive) 90%,transparent)}}.hover\:bg-primary\/90:hover{background-color:var(--primary)}@supports (color:color-mix(in lab,red,red)){.hover\:bg-primary\/90:hover{background-color:color-mix(in oklab,var(--primary) 90%,transparent)}}.hover\:bg-red-100:hover{background-color:var(--color-red-100)}.hover\:bg-red-800:hover{background-color:var(--color-red-800)}.hover\:bg-secondary\/80:hover{background-color:var(--secondary)}@supports (color:color-mix(in lab,red,red)){.hover\:bg-secondary\/80:hover{background-color:color-mix(in oklab,var(--secondary) 80%,transparent)}}.hover\:bg-white\/55:hover{background-color:#ffffff8c}@supports (color:color-mix(in lab,red,red)){.hover\:bg-white\/55:hover{background-color:color-mix(in oklab,var(--color-white) 55%,transparent)}}.hover\:text-accent-foreground:hover{color:var(--accent-foreground)}.hover\:text-red-800:hover{color:var(--color-red-800)}.hover\:text-red-900:hover{color:var(--color-red-900)}.hover\:underline:hover{text-decoration-line:underline}.hover\:opacity-100:hover{opacity:1}}.focus\:border-blue-400:focus{border-color:var(--color-blue-400)}.focus\:border-yellow-400:focus{border-color:var(--color-yellow-400)}.focus\:ring-2:focus{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.focus\:ring-blue-400:focus{--tw-ring-color:var(--color-blue-400)}.focus\:ring-ring:focus{--tw-ring-color:var(--ring)}.focus\:ring-yellow-400:focus{--tw-ring-color:var(--color-yellow-400)}.focus\:ring-offset-2:focus{--tw-ring-offset-width:2px;--tw-ring-offset-shadow:var(--tw-ring-inset,) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)}.focus\:outline-hidden:focus{--tw-outline-style:none;outline-style:none}@media (forced-colors:active){.focus\:outline-hidden:focus{outline-offset:2px;outline:2px solid #0000}}.focus-visible\:border-ring:focus-visible{border-color:var(--ring)}.focus-visible\:ring-\[3px\]:focus-visible{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.focus-visible\:ring-destructive\/20:focus-visible{--tw-ring-color:var(--destructive)}@supports (color:color-mix(in lab,red,red)){.focus-visible\:ring-destructive\/20:focus-visible{--tw-ring-color:color-mix(in oklab, var(--destructive) 20%, transparent)}}.focus-visible\:ring-ring\/50:focus-visible{--tw-ring-color:var(--ring)}@supports (color:color-mix(in lab,red,red)){.focus-visible\:ring-ring\/50:focus-visible{--tw-ring-color:color-mix(in oklab, var(--ring) 50%, transparent)}}@media (hover:hover){.enabled\:hover\:bg-white\/70:enabled:hover{background-color:#ffffffb3}@supports (color:color-mix(in lab,red,red)){.enabled\:hover\:bg-white\/70:enabled:hover{background-color:color-mix(in oklab,var(--color-white) 70%,transparent)}}}.disabled\:pointer-events-none:disabled{pointer-events:none}.disabled\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\:border-gray-400:disabled{border-color:var(--color-gray-400)}.disabled\:bg-gray-300:disabled{background-color:var(--color-gray-300)}.disabled\:text-gray-500:disabled{color:var(--color-gray-500)}.disabled\:opacity-30:disabled{opacity:.3}.disabled\:opacity-40:disabled{opacity:.4}.disabled\:opacity-50:disabled{opacity:.5}.has-data-\[slot\=card-action\]\:grid-cols-\[1fr_auto\]:has([data-slot=card-action]){grid-template-columns:1fr auto}.has-\[\>svg\]\:px-2\.5:has(>svg){padding-inline:calc(var(--spacing) * 2.5)}.has-\[\>svg\]\:px-3:has(>svg){padding-inline:calc(var(--spacing) * 3)}.has-\[\>svg\]\:px-4:has(>svg){padding-inline:calc(var(--spacing) * 4)}.aria-invalid\:border-destructive[aria-invalid=true]{border-color:var(--destructive)}.aria-invalid\:ring-destructive\/20[aria-invalid=true]{--tw-ring-color:var(--destructive)}@supports (color:color-mix(in lab,red,red)){.aria-invalid\:ring-destructive\/20[aria-invalid=true]{--tw-ring-color:color-mix(in oklab, var(--destructive) 20%, transparent)}}.data-\[disabled\=true\]\:pointer-events-none[data-disabled=true]{pointer-events:none}.data-\[disabled\=true\]\:opacity-50[data-disabled=true]{opacity:.5}.data-\[selected\=true\]\:bg-accent[data-selected=true]{background-color:var(--accent)}.data-\[selected\=true\]\:text-accent-foreground[data-selected=true]{color:var(--accent-foreground)}.data-\[side\=bottom\]\:slide-in-from-top-2[data-side=bottom]{--tw-enter-translate-y:calc(var(--spacing) * 2*-1)}.data-\[side\=left\]\:slide-in-from-right-2[data-side=left]{--tw-enter-translate-x:calc(var(--spacing) * 2)}.data-\[side\=right\]\:slide-in-from-left-2[data-side=right]{--tw-enter-translate-x:calc(var(--spacing) * 2*-1)}.data-\[side\=top\]\:slide-in-from-bottom-2[data-side=top]{--tw-enter-translate-y:calc(var(--spacing) * 2)}.data-\[state\=checked\]\:translate-x-\[calc\(100\%-2px\)\][data-state=checked]{--tw-translate-x: calc(100% - 2px) ;translate:var(--tw-translate-x) var(--tw-translate-y)}.data-\[state\=checked\]\:bg-primary[data-state=checked]{background-color:var(--primary)}.data-\[state\=closed\]\:animate-out[data-state=closed]{animation:exit var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)var(--tw-animation-delay,0s)var(--tw-animation-iteration-count,1)var(--tw-animation-direction,normal)var(--tw-animation-fill-mode,none)}.data-\[state\=closed\]\:fade-out-0[data-state=closed]{--tw-exit-opacity:0}.data-\[state\=closed\]\:zoom-out-95[data-state=closed]{--tw-exit-scale:.95}.data-\[state\=open\]\:animate-in[data-state=open]{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)var(--tw-animation-delay,0s)var(--tw-animation-iteration-count,1)var(--tw-animation-direction,normal)var(--tw-animation-fill-mode,none)}.data-\[state\=open\]\:bg-accent[data-state=open]{background-color:var(--accent)}.data-\[state\=open\]\:text-muted-foreground[data-state=open]{color:var(--muted-foreground)}.data-\[state\=open\]\:fade-in-0[data-state=open]{--tw-enter-opacity:0}.data-\[state\=open\]\:zoom-in-95[data-state=open]{--tw-enter-scale:.95}.data-\[state\=unchecked\]\:translate-x-0[data-state=unchecked]{--tw-translate-x:calc(var(--spacing) * 0);translate:var(--tw-translate-x) var(--tw-translate-y)}.data-\[state\=unchecked\]\:bg-input[data-state=unchecked]{background-color:var(--input)}@media (min-width:40rem){.sm\:max-w-lg{max-width:var(--container-lg)}.sm\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.sm\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.sm\:flex-row{flex-direction:row}.sm\:justify-end{justify-content:flex-end}.sm\:text-left{text-align:left}}@media (min-width:48rem){.md\:text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}}@media (min-width:64rem){.lg\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (min-width:80rem){.xl\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.xl\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}.dark\:border-input:is(.dark *){border-color:var(--input)}.dark\:bg-destructive\/60:is(.dark *){background-color:var(--destructive)}@supports (color:color-mix(in lab,red,red)){.dark\:bg-destructive\/60:is(.dark *){background-color:color-mix(in oklab,var(--destructive) 60%,transparent)}}.dark\:bg-input\/30:is(.dark *){background-color:var(--input)}@supports (color:color-mix(in lab,red,red)){.dark\:bg-input\/30:is(.dark *){background-color:color-mix(in oklab,var(--input) 30%,transparent)}}@media (hover:hover){.dark\:hover\:bg-accent\/50:is(.dark *):hover{background-color:var(--accent)}@supports (color:color-mix(in lab,red,red)){.dark\:hover\:bg-accent\/50:is(.dark *):hover{background-color:color-mix(in oklab,var(--accent) 50%,transparent)}}.dark\:hover\:bg-input\/50:is(.dark *):hover{background-color:var(--input)}@supports (color:color-mix(in lab,red,red)){.dark\:hover\:bg-input\/50:is(.dark *):hover{background-color:color-mix(in oklab,var(--input) 50%,transparent)}}}.dark\:focus-visible\:ring-destructive\/40:is(.dark *):focus-visible{--tw-ring-color:var(--destructive)}@supports (color:color-mix(in lab,red,red)){.dark\:focus-visible\:ring-destructive\/40:is(.dark *):focus-visible{--tw-ring-color:color-mix(in oklab, var(--destructive) 40%, transparent)}}.dark\:aria-invalid\:ring-destructive\/40:is(.dark *)[aria-invalid=true]{--tw-ring-color:var(--destructive)}@supports (color:color-mix(in lab,red,red)){.dark\:aria-invalid\:ring-destructive\/40:is(.dark *)[aria-invalid=true]{--tw-ring-color:color-mix(in oklab, var(--destructive) 40%, transparent)}}.dark\:data-\[state\=checked\]\:bg-primary-foreground:is(.dark *)[data-state=checked]{background-color:var(--primary-foreground)}.dark\:data-\[state\=unchecked\]\:bg-foreground:is(.dark *)[data-state=unchecked]{background-color:var(--foreground)}.dark\:data-\[state\=unchecked\]\:bg-input\/80:is(.dark *)[data-state=unchecked]{background-color:var(--input)}@supports (color:color-mix(in lab,red,red)){.dark\:data-\[state\=unchecked\]\:bg-input\/80:is(.dark *)[data-state=unchecked]{background-color:color-mix(in oklab,var(--input) 80%,transparent)}}.\[\&_\[cmdk-group-heading\]\]\:px-2 [cmdk-group-heading]{padding-inline:calc(var(--spacing) * 2)}.\[\&_\[cmdk-group-heading\]\]\:py-1\.5 [cmdk-group-heading]{padding-block:calc(var(--spacing) * 1.5)}.\[\&_\[cmdk-group-heading\]\]\:text-xs [cmdk-group-heading]{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.\[\&_\[cmdk-group-heading\]\]\:font-medium [cmdk-group-heading]{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.\[\&_\[cmdk-group-heading\]\]\:text-muted-foreground [cmdk-group-heading]{color:var(--muted-foreground)}.\[\&_\[cmdk-group\]\]\:px-2 [cmdk-group]{padding-inline:calc(var(--spacing) * 2)}.\[\&_\[cmdk-group\]\:not\(\[hidden\]\)_\~\[cmdk-group\]\]\:pt-0 [cmdk-group]:not([hidden])~[cmdk-group]{padding-top:calc(var(--spacing) * 0)}.\[\&_\[cmdk-input-wrapper\]_svg\]\:h-5 [cmdk-input-wrapper] svg{height:calc(var(--spacing) * 5)}.\[\&_\[cmdk-input-wrapper\]_svg\]\:w-5 [cmdk-input-wrapper] svg{width:calc(var(--spacing) * 5)}.\[\&_\[cmdk-input\]\]\:h-12 [cmdk-input]{height:calc(var(--spacing) * 12)}.\[\&_\[cmdk-item\]\]\:px-2 [cmdk-item]{padding-inline:calc(var(--spacing) * 2)}.\[\&_\[cmdk-item\]\]\:py-3 [cmdk-item]{padding-block:calc(var(--spacing) * 3)}.\[\&_\[cmdk-item\]_svg\]\:h-5 [cmdk-item] svg{height:calc(var(--spacing) * 5)}.\[\&_\[cmdk-item\]_svg\]\:w-5 [cmdk-item] svg{width:calc(var(--spacing) * 5)}.\[\&_\[data-slot\=command-input-wrapper\]\]\:h-12 [data-slot=command-input-wrapper]{height:calc(var(--spacing) * 12)}.\[\&_svg\]\:pointer-events-none svg{pointer-events:none}.\[\&_svg\]\:shrink-0 svg{flex-shrink:0}.\[\&_svg\:not\(\[class\*\=\'size-\'\]\)\]\:size-4 svg:not([class*=size-]){width:calc(var(--spacing) * 4);height:calc(var(--spacing) * 4)}.\[\&_svg\:not\(\[class\*\=\'text-\'\]\)\]\:text-muted-foreground svg:not([class*=text-]){color:var(--muted-foreground)}.\[\.border-b\]\:pb-6.border-b{padding-bottom:calc(var(--spacing) * 6)}.\[\.border-t\]\:pt-6.border-t{padding-top:calc(var(--spacing) * 6)}}@property --tw-animation-delay{syntax:"*";inherits:false;initial-value:0s}@property --tw-animation-direction{syntax:"*";inherits:false;initial-value:normal}@property --tw-animation-duration{syntax:"*";inherits:false}@property --tw-animation-fill-mode{syntax:"*";inherits:false;initial-value:none}@property --tw-animation-iteration-count{syntax:"*";inherits:false;initial-value:1}@property --tw-enter-blur{syntax:"*";inherits:false;initial-value:0}@property --tw-enter-opacity{syntax:"*";inherits:false;initial-value:1}@property --tw-enter-rotate{syntax:"*";inherits:false;initial-value:0}@property --tw-enter-scale{syntax:"*";inherits:false;initial-value:1}@property --tw-enter-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-enter-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-blur{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-opacity{syntax:"*";inherits:false;initial-value:1}@property --tw-exit-rotate{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-scale{syntax:"*";inherits:false;initial-value:1}@property --tw-exit-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-translate-y{syntax:"*";inherits:false;initial-value:0}:root{--radius:.65rem;--background:oklch(100% 0 0);--foreground:oklch(14.1% .005 285.823);--card:oklch(100% 0 0);--card-foreground:oklch(14.1% .005 285.823);--popover:oklch(100% 0 0);--popover-foreground:oklch(14.1% .005 285.823);--primary:oklch(72.3% .219 149.579);--primary-foreground:oklch(98.2% .018 155.826);--secondary:oklch(96.7% .001 286.375);--secondary-foreground:oklch(21% .006 285.885);--muted:oklch(96.7% .001 286.375);--muted-foreground:oklch(55.2% .016 285.938);--accent:oklch(96.7% .001 286.375);--accent-foreground:oklch(21% .006 285.885);--destructive:oklch(57.7% .245 27.325);--border:oklch(92% .004 286.32);--input:oklch(92% .004 286.32);--ring:oklch(72.3% .219 149.579);--chart-1:oklch(64.6% .222 41.116);--chart-2:oklch(60% .118 184.704);--chart-3:oklch(39.8% .07 227.392);--chart-4:oklch(82.8% .189 84.429);--chart-5:oklch(76.9% .188 70.08);--sidebar:oklch(98.5% 0 0);--sidebar-foreground:oklch(14.1% .005 285.823);--sidebar-primary:oklch(72.3% .219 149.579);--sidebar-primary-foreground:oklch(98.2% .018 155.826);--sidebar-accent:oklch(96.7% .001 286.375);--sidebar-accent-foreground:oklch(21% .006 285.885);--sidebar-border:oklch(92% .004 286.32);--sidebar-ring:oklch(72.3% .219 149.579)}.dark{--background:oklch(14.1% .005 285.823);--foreground:oklch(98.5% 0 0);--card:oklch(21% .006 285.885);--card-foreground:oklch(98.5% 0 0);--popover:oklch(21% .006 285.885);--popover-foreground:oklch(98.5% 0 0);--primary:oklch(69.6% .17 162.48);--primary-foreground:oklch(39.3% .095 152.535);--secondary:oklch(27.4% .006 286.033);--secondary-foreground:oklch(98.5% 0 0);--muted:oklch(27.4% .006 286.033);--muted-foreground:oklch(70.5% .015 286.067);--accent:oklch(27.4% .006 286.033);--accent-foreground:oklch(98.5% 0 0);--destructive:oklch(70.4% .191 22.216);--border:oklch(100% 0 0/.1);--input:oklch(100% 0 0/.15);--ring:oklch(52.7% .154 150.069);--chart-1:oklch(48.8% .243 264.376);--chart-2:oklch(69.6% .17 162.48);--chart-3:oklch(76.9% .188 70.08);--chart-4:oklch(62.7% .265 303.9);--chart-5:oklch(64.5% .246 16.439);--sidebar:oklch(21% .006 285.885);--sidebar-foreground:oklch(98.5% 0 0);--sidebar-primary:oklch(69.6% .17 162.48);--sidebar-primary-foreground:oklch(39.3% .095 152.535);--sidebar-accent:oklch(27.4% .006 286.033);--sidebar-accent-foreground:oklch(98.5% 0 0);--sidebar-border:oklch(100% 0 0/.1);--sidebar-ring:oklch(52.7% .154 150.069)}.ga_action_box{background:url(https://gpzz.innogamescdn.com/images/game/academy/tech_frame.png) no-repeat;width:58px;height:59px;position:relative}.ga_action_icon{margin:4px;position:absolute;top:0;left:0}.ga_action_building{background-size:50px 50px;width:50px;height:50px}@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-z{syntax:"*";inherits:false;initial-value:0}@property --tw-rotate-x{syntax:"*";inherits:false}@property --tw-rotate-y{syntax:"*";inherits:false}@property --tw-rotate-z{syntax:"*";inherits:false}@property --tw-skew-x{syntax:"*";inherits:false}@property --tw-skew-y{syntax:"*";inherits:false}@property --tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-space-x-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-tracking{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-outline-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-blur{syntax:"*";inherits:false}@property --tw-brightness{syntax:"*";inherits:false}@property --tw-contrast{syntax:"*";inherits:false}@property --tw-grayscale{syntax:"*";inherits:false}@property --tw-hue-rotate{syntax:"*";inherits:false}@property --tw-invert{syntax:"*";inherits:false}@property --tw-opacity{syntax:"*";inherits:false}@property --tw-saturate{syntax:"*";inherits:false}@property --tw-sepia{syntax:"*";inherits:false}@property --tw-drop-shadow{syntax:"*";inherits:false}@property --tw-drop-shadow-color{syntax:"*";inherits:false}@property --tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:"*";inherits:false}@property --tw-backdrop-blur{syntax:"*";inherits:false}@property --tw-backdrop-brightness{syntax:"*";inherits:false}@property --tw-backdrop-contrast{syntax:"*";inherits:false}@property --tw-backdrop-grayscale{syntax:"*";inherits:false}@property --tw-backdrop-hue-rotate{syntax:"*";inherits:false}@property --tw-backdrop-invert{syntax:"*";inherits:false}@property --tw-backdrop-opacity{syntax:"*";inherits:false}@property --tw-backdrop-saturate{syntax:"*";inherits:false}@property --tw-backdrop-sepia{syntax:"*";inherits:false}@property --tw-duration{syntax:"*";inherits:false}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{opacity:.5}}@keyframes enter{0%{opacity:var(--tw-enter-opacity,1);transform:translate3d(var(--tw-enter-translate-x,0),var(--tw-enter-translate-y,0),0)scale3d(var(--tw-enter-scale,1),var(--tw-enter-scale,1),var(--tw-enter-scale,1))rotate(var(--tw-enter-rotate,0));filter:blur(var(--tw-enter-blur,0))}}@keyframes exit{to{opacity:var(--tw-exit-opacity,1);transform:translate3d(var(--tw-exit-translate-x,0),var(--tw-exit-translate-y,0),0)scale3d(var(--tw-exit-scale,1),var(--tw-exit-scale,1),var(--tw-exit-scale,1))rotate(var(--tw-exit-rotate,0));filter:blur(var(--tw-exit-blur,0))}}`);

    function log(module, msg, type = 'info') {
        const t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        logs.unshift({ t, module, msg, type });
        if (logs.length > 100) logs.pop();
        updateConsole();
    }

    function updateConsole() {
        const container = document.getElementById('console-logs');
        if (!container) return;
        if (logs.length === 0) {
            container.innerHTML = '<div class="logs-empty">Aucune activite</div>';
            return;
        }
        container.innerHTML = logs.slice(0, 50).map(l => {
            const moduleClass = l.module.toLowerCase();
            return `<div class="log-entry ${l.type} ${moduleClass}"><span class="log-time">${l.t}</span><span class="log-module">[${l.module}]</span><span class="log-message">${l.msg}</span></div>`;
        }).join('');
    }

    function checkWhitelist(callback) {
        console.log('[GU] Verification whitelist...');
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${WHITELIST_URL}?v=${Date.now()}`,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        whitelistData = JSON.parse(response.responseText);
                        const playerName = getPlayerName().toLowerCase();
                        const worldId = getWorldName().toLowerCase();
                        const playerId = getPlayerId();
                        let access = null;
                        if (whitelistData.players) {
                            for (const entry of whitelistData.players) {
                                const nameMatch = entry.name.toLowerCase() === playerName || entry.playerId === playerId;
                                if (nameMatch) {
                                    if (!entry.servers || entry.servers.length === 0 || entry.servers.includes('*')) {
                                        access = entry;
                                        break;
                                    }
                                    if (entry.servers.some(s => s.toLowerCase() === worldId)) {
                                        access = entry;
                                        break;
                                    }
                                }
                            }
                        }
                        if (access) {
                            userAccess = {
                                allowed: true,
                                modules: access.modules || ['*'],
                                name: access.name,
                                servers: access.servers || ['*']
                            };
                            console.log('[GU] Acces autorise:', userAccess);
                            callback(true);
                        } else {
                            userAccess = { allowed: false, reason: 'not_whitelisted' };
                            console.log('[GU] Acces refuse - non whitelist');
                            callback(false);
                        }
                    } catch (e) {
                        console.error('[GU] Erreur parsing whitelist:', e);
                        userAccess = { allowed: true, modules: ['*'] };
                        callback(true);
                    }
                } else {
                    console.log('[GU] Whitelist non trouvee, acces autorise par defaut');
                    userAccess = { allowed: true, modules: ['*'] };
                    callback(true);
                }
            },
            onerror: function() {
                console.log('[GU] Erreur reseau whitelist, acces autorise');
                userAccess = { allowed: true, modules: ['*'] };
                callback(true);
            }
        });
    }

    function isModuleAllowed(moduleId) {
        if (!userAccess || !userAccess.allowed) return false;
        if (userAccess.modules.includes('*')) return true;
        return userAccess.modules.includes(moduleId);
    }

    function showAccessDenied() {
        const playerName = getPlayerName();
        const worldId = getWorldName();
        const overlay = document.createElement('div');
        overlay.className = 'access-denied-overlay';
        overlay.innerHTML = `
            <div class="access-denied-box">
                <div class="access-denied-icon">🚫</div>
                <h1 class="access-denied-title">ACCES NON AUTORISE</h1>
                <p class="access-denied-text">
                    Vous n'etes pas dans la whitelist pour utiliser ce bot.<br>
                    Pour obtenir l'acces, veuillez faire une demande sur notre Discord.
                </p>
                <div class="access-denied-info">
                    <p><span class="label">👤 Joueur:</span> <span class="value">${playerName}</span></p>
                    <p><span class="label">🌍 Serveur:</span> <span class="value">${worldId}</span></p>
                    <p class="error">✕ Serveur ${worldId} non autorise</p>
                </div>
                <a href="${DISCORD_INVITE}" target="_blank" class="access-denied-discord">
                    <svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0 a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    Rejoindre le Discord
                </a>
                <div class="access-denied-footer">
                    Grepolis Ultimate Bot V${VERSION} - Systeme de Whitelist
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function createUI() {
        const btn = document.createElement('div');
        btn.className = 'ultimate-bot-btn';
        btn.id = 'ultimate-bot-btn';
        btn.innerHTML = 'Ultimate<br>Bot';
        btn.onclick = () => togglePanel();
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.className = 'ultimate-panel';
        panel.id = 'ultimate-panel';

        const tabsHtml = TABS_CONFIG.map(tab => {
            let classes = 'ultimate-tab';
            if (tab.id === 'info') classes += ' active';
            if (tab.disabled) classes += ' disabled';
            else if (!isModuleAllowed(tab.id) && tab.id !== 'settings') classes += ' locked';
            return `<button class="${classes}" data-tab="${tab.id}">
                <span class="tab-icon">${tab.icon}</span>${tab.name}
            </button>`;
        }).join('');

        const contentsHtml = TABS_CONFIG.map(tab => 
            `<div class="tab-content${tab.id === 'info' ? ' active' : ''}" id="tab-${tab.id}">
                <div class="gu-loading"><div class="gu-loading-spinner">⏳</div>Chargement...</div>
            </div>`
        ).join('');

        panel.innerHTML = `
            <div class="ultimate-header">
                <div class="ultimate-title"><span>Ultimate Bot</span><span class="ultimate-version">V${VERSION}</span></div>
                <button class="ultimate-close" id="ultimate-close">X</button>
            </div>
            <div class="ultimate-tabs">${tabsHtml}</div>
            <div class="ultimate-main">
                <div class="ultimate-body">${contentsHtml}</div>
                <div class="ultimate-console">
                    <div class="console-header"><span>📜</span> Console</div>
                    <div class="console-content" id="console-logs"><div class="logs-empty">Aucune activite</div></div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('ultimate-close').onclick = () => togglePanel();

        document.querySelectorAll('.ultimate-tab').forEach(tab => {
            tab.onclick = () => {
                if (tab.classList.contains('disabled')) return;
                const tabId = tab.dataset.tab;
                const tabConfig = TABS_CONFIG.find(t => t.id === tabId);
                if (tab.classList.contains('locked')) {
                    document.querySelectorAll('.ultimate-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    const content = document.getElementById(`tab-${tabId}`);
                    content.classList.add('active');
                    content.innerHTML = `
                        <div class="locked-module-container">
                            <div class="locked-module-icon">🔒</div>
                            <div class="locked-module-title">Module Verrouille</div>
                            <div class="locked-module-text">
                                Vous n'avez pas acces a ce module.<br>
                                Contactez l'administrateur sur Discord pour debloquer.
                            </div>
                            <a href="${DISCORD_INVITE}" target="_blank" class="btn btn-discord" style="margin-top:20px;display:inline-block;text-decoration:none;">
                                Rejoindre le Discord
                            </a>
                        </div>
                    `;
                    currentTab = tabId;
                    return;
                }
                document.querySelectorAll('.ultimate-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${tabId}`).classList.add('active');
                currentTab = tabId;
                loadTab(tabConfig);
            };
        });

        const firstAllowedTab = TABS_CONFIG.find(t => !t.disabled && isModuleAllowed(t.id));
        if (firstAllowedTab) {
            loadTab(firstAllowedTab);
        }

        initDraggable(panel);
        preloadAllTabs();
        log('SYSTEM', 'Interface chargee', 'success');
        log('SYSTEM', `Bienvenue ${getPlayerName()}!`, 'info');
    }

    function initDraggable(panel) {
        const header = panel.querySelector('.ultimate-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let hasMoved = false;

        header.addEventListener('mousedown', function(e) {
            if (e.target.closest('.ultimate-close')) return;
            isDragging = true;
            hasMoved = false;
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            panel.classList.add('dragging');
            panel.style.transform = 'none';
            panel.style.left = startLeft + 'px';
            panel.style.top = startTop + 'px';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasMoved = true;
            }
            let newLeft = startLeft + deltaX;
            let newTop = startTop + deltaY;
            const maxLeft = window.innerWidth - panel.offsetWidth;
            const maxTop = window.innerHeight - panel.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                panel.classList.remove('dragging');
            }
        });
    }

    function preloadAllTabs() {
        log('SYSTEM', 'Prechargement des modules...', 'info');
        let loadIndex = 0;
        const tabsToLoad = TABS_CONFIG.filter(t => !t.disabled && isModuleAllowed(t.id) && t.id !== currentTab);
        function loadNextTab() {
            if (loadIndex >= tabsToLoad.length) {
                log('SYSTEM', 'Tous les modules precharges', 'success');
                return;
            }
            const tab = tabsToLoad[loadIndex];
            loadIndex++;
            if (loadedTabs[tab.id]) {
                loadNextTab();
                return;
            }
            const scriptUrl = `${BASE_URL}/${tab.script}?v=${Date.now()}`;
            GM_xmlhttpRequest({
                method: 'GET',
                url: scriptUrl,
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const tabModule = {
                                uw: uw,
                                log: log,
                                getPlayerName: getPlayerName,
                                getWorldName: getWorldName,
                                GM_getValue: GM_getValue,
                                GM_setValue: GM_setValue,
                                GM_addStyle: GM_addStyle,
                                GM_xmlhttpRequest: GM_xmlhttpRequest
                            };
                            const executeTab = new Function('module', response.responseText);
                            executeTab(tabModule);
                            loadedTabs[tab.id] = tabModule;
                            const content = document.getElementById(`tab-${tab.id}`);
                            if (content && tabModule.render) {
                                content.innerHTML = '';
                                tabModule.render(content);
                                if (tabModule.init) {
                                    tabModule.init();
                                }
                            }
                        } catch (e) {
                            console.error(`[GU] Erreur preload "${tab.name}":`, e);
                        }
                    }
                    setTimeout(loadNextTab, 100);
                },
                onerror: function() {
                    setTimeout(loadNextTab, 100);
                }
            });
        }
        setTimeout(loadNextTab, 500);
    }

    function togglePanel() {
        panelOpen = !panelOpen;
        document.getElementById('ultimate-panel').classList.toggle('open', panelOpen);
    }

    function loadTab(tab) {
        if (!tab || tab.disabled) return;
        if (!isModuleAllowed(tab.id) && tab.id !== 'settings') return;
        const content = document.getElementById(`tab-${tab.id}`);
        if (!content) return;
        if (loadedTabs[tab.id]) {
            if (loadedTabs[tab.id].onActivate) {
                loadedTabs[tab.id].onActivate(content);
            }
            return;
        }
        content.innerHTML = '<div class="gu-loading"><div class="gu-loading-spinner">⏳</div>Chargement...</div>';
        const scriptUrl = `${BASE_URL}/${tab.script}?v=${Date.now()}`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: scriptUrl,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const tabModule = {
                            uw: uw,
                            log: log,
                            getPlayerName: getPlayerName,
                            getWorldName: getWorldName,
                            GM_getValue: GM_getValue,
                            GM_setValue: GM_setValue,
                            GM_addStyle: GM_addStyle,
                            GM_xmlhttpRequest: GM_xmlhttpRequest
                        };
                        const executeTab = new Function('module', response.responseText);
                        executeTab(tabModule);
                        loadedTabs[tab.id] = tabModule;
                        if (currentTab === tab.id && tabModule.render) {
                            content.innerHTML = '';
                            tabModule.render(content);
                            if (tabModule.init) {
                                tabModule.init();
                            }
                        }
                        log('SYSTEM', `Onglet "${tab.name}" charge`, 'success');
                    } catch (e) {
                        content.innerHTML = `<div class="gu-loading">Erreur: ${e.message}</div>`;
                        log('SYSTEM', `Erreur onglet "${tab.name}": ${e.message}`, 'error');
                        console.error(`[GU] Erreur onglet "${tab.name}":`, e);
                    }
                } else {
                    content.innerHTML = `<div class="coming-soon-container"><div class="coming-soon-icon">🚧</div><div class="coming-soon-title">${tab.name}</div><div class="coming-soon-text">Module non disponible</div></div>`;
                }
            },
            onerror: function() {
                content.innerHTML = `<div class="coming-soon-container"><div class="coming-soon-icon">🚧</div><div class="coming-soon-title">${tab.name}</div><div class="coming-soon-text">Erreur de connexion</div></div>`;
                log('SYSTEM', `Erreur reseau: ${tab.name}`, 'error');
            }
        });
    }

    window.GrepolisUltimate = {
        loadedTabs,
        log,
        uw,
        userAccess,
        reloadTab: function(tabId) {
            delete loadedTabs[tabId];
            const tab = TABS_CONFIG.find(t => t.id === tabId);
            if (tab) loadTab(tab);
        },
        getTabModule: function(tabId) {
            return loadedTabs[tabId];
        },
        isModuleAllowed: isModuleAllowed,
        updateButtonState: function() {
            const btn = document.getElementById('ultimate-bot-btn');
            if (!btn) return;
            let hasActive = false;
            for (const tabId in loadedTabs) {
                if (loadedTabs[tabId].isActive && loadedTabs[tabId].isActive()) {
                    hasActive = true;
                    break;
                }
            }
            if (hasActive) btn.classList.add('has-active');
            else btn.classList.remove('has-active');
        }
    };

    const initCheck = setInterval(() => {
        if (typeof uw.Game !== 'undefined' && uw.ITowns && uw.ITowns.getCurrentTown()) {
            clearInterval(initCheck);
            checkWhitelist(function(allowed) {
                if (allowed) {
                    createUI();
                } else {
                    showAccessDenied();
                }
            });
        }
    }, 1000);

    console.log('%c[Grepolis Ultimate]%c Main.js V' + VERSION + ' charge', 'color: #4caf50; font-weight: bold;', 'color: inherit;');
})();
