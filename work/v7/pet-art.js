'use strict';
// Layered SVG keeps every hair / garment / iris combination crisp and independently editable.
const PetArt={
 svg(config){
  const p=PetModel.normalize(config),hair=PetModel.options.hairColor[p.hairColor][1],iris=PetModel.options.eyes[p.eyes][1],cloth=PetModel.options.outfitColor[p.outfitColor][1];
  const long=`<path d="M87 104Q46 166 48 261L23 400Q50 392 67 350L60 411 110 417 131 273 247 272 261 417 304 405 293 356Q309 391 330 394L308 255Q315 148 267 103Z"/><path class="pet-ink-line" d="M77 175Q58 282 43 371M96 226 82 391M284 167Q299 294 311 366M268 254 279 398"/>`;
  const bob=`<path d="M83 113Q44 143 47 233L41 274Q62 290 97 279L123 247 242 253Q284 285 309 270L302 218Q303 142 272 111Z"/><path class="pet-ink-line" d="M59 186 56 264M285 181 296 255"/>`;
  const twin=`<path d="M70 130Q27 117 23 175L30 230 14 368Q43 351 51 322L40 386Q83 365 88 295L94 172ZM276 130Q319 112 330 163L327 232 343 372Q318 364 307 324L319 388Q279 371 266 285L257 165Z"/><path class="pet-ink-line" d="M45 166Q67 241 35 347M299 162Q282 256 321 354"/><path d="M60 141 87 146M265 147 290 139" stroke="#dba8c1" stroke-width="10"/>`;
  const hoodie=`<path d="M123 274Q89 280 67 308L46 425H304L284 308Q264 281 225 274L212 291 140 292Z"/><path fill="#fff" fill-opacity=".1" d="M82 306Q103 276 126 285L144 301 128 322ZM217 291Q244 274 273 302L232 322Z"/><path class="pet-seam" d="M117 281Q99 293 103 305Q168 362 241 306Q246 293 227 282M116 305Q176 344 229 306M89 321 78 412M261 320 273 412M118 393Q176 375 236 393L242 416H110Z"/><path d="M136 323 129 368M212 324 219 369" fill="none" stroke="#e5dfed" stroke-width="2.3"/><path d="M127 362 126 374M221 364 222 376" stroke="#292b38" stroke-width="4"/><path d="m169 351 7-9 7 9-7 8Z" fill="#c5b0df" stroke="none"/>`;
  const sailor=`<path d="M126 275 84 295 59 324 48 425H302L290 324 265 295 223 275 195 297H154Z"/><path fill="#faf3eb" d="M126 276 94 296 143 343 175 317 210 344 258 296 222 275 175 300Z"/><path class="pet-seam" d="m109 294 35 35 30-20 36 21 33-35M85 326 77 410M268 326 278 411"/><path fill="#af86be" d="M173 318Q147 302 142 314L147 341 174 329 180 363 197 357 180 327Q208 345 213 332L211 308Q196 306 179 318Z"/><circle cx="176" cy="323" r="7" fill="#d1b9df"/><path class="pet-seam" d="M174 367V416"/>`;
  const sweater=`<path d="M127 269 110 290Q73 294 62 329L48 425H303L288 329Q281 300 236 290L220 269Z"/><path fill="#fff" fill-opacity=".14" d="M127 269Q172 282 220 269L229 298Q172 323 118 298Z"/><path class="pet-seam" d="M127 271 121 299M140 274 137 303M155 276 153 306M172 277V307M190 275 192 305M206 273 211 303M219 271 224 299M80 332 73 408M268 332 281 408M62 409H291"/><path class="pet-knit" d="m111 329 7 6-7 6 7 6-7 6 7 6-7 6 7 6-7 6 7 6M236 329l-7 6 7 6-7 6 7 6-7 6 7 6-7 6 7 6-7 6M162 338l10 7 10-7m-20 19 10 7 10-7m-20 19 10 7 10-7"/>`;
  let accessory='';
  if(p.accessory==='bow')accessory=`<g transform="translate(266 116) rotate(18)" fill="#bf94c3" stroke="#65516f" stroke-width="2"><path d="M0 0Q-33-28-37-9L-35 12Q-33 23 0 5 29 23 34 10L36-11Q31-25 0 0Z"/><path d="M-3 6-14 36 0 30 7 37 9 9"/><circle cx="0" cy="3" r="7" fill="#ead2e7"/></g>`;
  if(p.accessory==='clip')accessory=`<g stroke="#bea161" stroke-width="2" fill="#ffe4a4"><path d="m266 117 4 9 10 1-8 7 2 10-9-5-9 5 2-10-7-7 10-1Z"/><path d="M249 146 273 151" stroke="#e4d7f4" stroke-width="4"/></g>`;
  if(p.accessory==='bell')accessory=`<g transform="translate(267 123)" stroke="#7d5879" stroke-width="2"><path d="M0 0-26-13-2-15 2-3 22-17 26-2 4 4" fill="#cb98b1"/><path d="M0 2V19"/><circle cy="26" r="12" fill="#efd199" stroke="#a58a5e"/><path d="M-8 27H8M0 27V34" stroke="#a58a5e"/><circle cy="26" r="2" fill="#a58a5e"/></g>`;
  const eye=(x,flip)=>`<g transform="translate(${x} 185)${flip?' scale(-1 1)':''}"><path class="pet-eye-white" d="M-29-10Q-6-22 27-5L22 14Q1 29-23 13Z" fill="#fffaf5" stroke="#b6a2ac" stroke-width="1.3"/><g class="pet-eye-open"><path d="M-15-13Q2-20 17-8L17 11Q2 30-14 13Z" fill="${iris}" stroke="#41404c" stroke-width="1.7"/><path d="M-13 8Q1 22 15 9L12 18Q0 27-10 17Z" fill="#fff" opacity=".25"/><ellipse cx="2" cy="2" rx="5" ry="13" fill="#302d3b"/><ellipse cx="-7" cy="-6" rx="4" ry="6" fill="#fff" opacity=".9"/><circle cx="10" cy="10" r="2" fill="#fff"/></g><path d="M-30-10Q-7-19 27-5L23 0Q-6-10-29-5Z" fill="#32313d" stroke="#32313d" stroke-width="2"/><path d="m-26-8-6-5M-22-10-5-6" stroke="#32313d" stroke-width="2.5"/><path class="pet-eye-closed" d="M-28-3Q-5 12 25 0" stroke="#454052" stroke-width="3.5" fill="none"/><path d="M-23 17Q-3 25 20 16" fill="none" stroke="#b49fa8" stroke-width="1.4"/></g>`;
  return `<svg class="pet-art" viewBox="0 0 350 425" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="--pet-hair:${hair};--pet-cloth:${cloth}">
   <g stroke="#292a35" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <g class="pet-back-hair" fill="${hair}">${p.hairStyle==='bob'?bob:p.hairStyle==='twin'?twin:long}</g>
    <path d="M143 237Q151 268 136 280L112 291Q175 342 238 291L214 281Q201 264 210 237Z" fill="#f5e9e3"/>
    <path d="M149 247Q175 274 205 251L204 266Q177 290 147 267Z" fill="#c4a5b0" fill-opacity=".35" stroke="none"/>
    <g class="pet-garment" fill="${cloth}">${{hoodie,sailor,sweater}[p.outfit]}</g>
    <g class="pet-face-group">
     <path d="M88 71Q69 29 51 22 49 76 83 109M255 67Q291 27 304 31 310 78 273 112" fill="${hair}" stroke-width="3"/>
     <path d="m60 39 10 45 17 12 4-18Z M294 47l-24 34 1 16 20-21Z" fill="#d4b9c4" stroke="#69616c" stroke-width="1.6"/>
     <path d="m67 62 10 4-1 10 12 2M289 64l-10 7 1 10-10 3" stroke="#eee7ec" stroke-width="5"/>
     <path d="M76 153Q62 98 105 65 163 22 231 59 291 82 280 160L264 234Q237 269 177 285 124 273 90 237Z" fill="#f7eee8"/>
     <path d="M79 150 88 211Q92 240 122 258L177 280Q120 280 85 240Z" fill="#bfa5af" fill-opacity=".25" stroke="none"/>
     <path d="M105 156Q122 148 145 155M210 155Q231 150 249 161" stroke="#71626d" stroke-width="2" fill="none"/>
     <g class="pet-eyes">${eye(124,false)}${eye(231,true)}</g>
     <path d="m173 213-3 8 4 1" fill="none" stroke="#c3a8ae" stroke-width="1.4"/>
     <path class="pet-neutral-mouth" d="M165 244Q174 240 184 245" fill="none" stroke="#98818f" stroke-width="1.9"/>
     <path class="pet-happy-mouth" d="M163 239Q173 251 185 239" fill="none" stroke="#98818f" stroke-width="2"/>
     <path d="M98 225 116 230M237 229 255 224" stroke="#dba7b6" stroke-width="7" opacity=".4"/>
     <path d="m97 225-2 5m9-3-2 5m9-3-2 5m128-3-2 5m9-7-2 5m9-7-2 5" stroke="#c48d9d" stroke-width="1"/>
    </g>
    <g class="pet-front-hair" fill="${hair}">
     <path d="M76 178Q60 130 81 86 106 24 179 33 247 25 277 91 295 136 278 196L269 228 250 246 260 218 240 229Q255 205 255 170 240 163 220 141L202 95Q211 148 236 182 207 174 185 143L162 85Q166 135 189 174 163 170 145 142L128 100Q128 148 108 174L101 146 91 188Z"/>
     <path d="M89 121Q75 163 82 207L106 238 91 239 113 253Q90 256 78 233L72 250Q57 224 68 178Z"/>
     <path d="M267 115Q283 166 273 211L249 244 267 240 248 260Q279 250 285 231L283 255Q302 229 289 177Z"/>
     <path class="pet-ink-line" d="M102 94Q111 61 154 48M154 71Q148 108 170 151M184 65Q180 108 211 151M218 63Q246 80 258 128M104 109 91 164M74 184Q68 220 88 241M280 178Q289 211 268 240"/>
     <path d="M94 92Q115 52 151 49M199 48Q235 51 252 87" fill="none" stroke="#fff" stroke-opacity=".11" stroke-width="5"/>
    </g>
    <g class="pet-accessory-layer">${accessory}</g>
   </g>
  </svg>`;
 }
};
