const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

// Test single continuous outline model
// viewBox: 0 0 320 600
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 600" width="320" height="600">
  <rect width="320" height="600" fill="#081528" />

  <defs>
    <!-- Picture 2 Gradients -->
    <linearGradient id="grad-chest" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e" />
      <stop offset="100%" stop-color="#fb7185" />
    </linearGradient>
    <linearGradient id="grad-arms" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#34d399" />
    </linearGradient>
    <linearGradient id="grad-legs" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <linearGradient id="grad-shoulders" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <linearGradient id="grad-core" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#4ade80" />
    </linearGradient>
  </defs>

  <!-- ── 1. THE SINGLE CONTINUOUS OUTLINE OF THE ENTIRE BODY ── -->
  <!-- Base body silhouette fill -->
  <path
    d="M 160 30
       C 174 30, 182 42, 182 58
       C 182 72, 175 84, 168 90
       C 169 96, 172 104, 176 110
       C 186 114, 202 118, 218 122
       C 236 126, 248 138, 248 156
       C 248 172, 238 184, 226 190
       C 234 204, 238 226, 234 246
       C 246 260, 254 286, 252 308
       C 250 320, 242 344, 236 348
       C 232 346, 228 338, 230 324
       C 226 304, 218 280, 218 250
       C 214 234, 214 214, 212 198
       C 200 200, 196 216, 194 246
       C 192 268, 196 288, 200 302
       C 208 322, 214 362, 206 404
       C 200 424, 198 438, 198 450
       C 208 468, 208 502, 198 534
       C 194 546, 194 558, 198 564
       C 204 572, 206 580, 196 582
       L 180 582
       C 176 578, 178 564, 180 554
       C 182 532, 186 500, 180 472
       C 176 450, 176 434, 178 418
       C 182 390, 178 356, 162 334
       C 160 332, 160 332, 158 334
       C 142 356, 138 390, 142 418
       C 144 434, 144 450, 140 472
       C 134 500, 138 532, 140 554
       C 142 564, 144 578, 140 582
       L 124 582
       C 114 580, 116 572, 122 564
       C 126 558, 126 546, 122 534
       C 112 502, 112 468, 122 450
       C 122 438, 120 424, 114 404
       C 106 362, 112 322, 120 302
       C 124 288, 128 268, 126 246
       C 124 216, 120 200, 108 198
       C 106 214, 106 234, 102 250
       C 102 280, 94 304, 90 324
       C 92 338, 88 346, 84 348
       C 78 344, 70 320, 68 308
       C 66 286, 74 260, 86 246
       C 82 226, 86 204, 94 190
       C 82 184, 72 172, 72 156
       C 72 138, 84 126, 102 122
       C 118 118, 134 114, 144 110
       C 148 104, 151 96, 152 90
       C 145 84, 138 72, 138 58
       C 138 42, 146 30, 160 30 Z"
    fill="rgba(15, 23, 42, 0.65)"
    stroke="rgba(255, 255, 255, 0.45)"
    stroke-width="1.6"
    stroke-linejoin="round"
  />

  <!-- ── 2. MINIMAL INTERIOR MUSCLE ZONES (CLUTTER-FREE) ── -->

  <!-- Chest Active (Picture 2 Coral Red) -->
  <g id="part-chest">
    <path
      d="M 160 114 C 144 112, 118 114, 104 126 C 98 136, 96 156, 108 168 C 124 174, 146 172, 159 168 L 159 114 Z"
      fill="url(#grad-chest)" fill-opacity="0.92" stroke="#fb7185" stroke-width="1.2"
    />
    <path
      d="M 160 114 C 176 112, 202 114, 216 126 C 222 136, 224 156, 212 168 C 196 174, 174 172, 161 168 L 161 114 Z"
      fill="url(#grad-chest)" fill-opacity="0.92" stroke="#fb7185" stroke-width="1.2"
    />
  </g>

  <!-- Arms Active (Picture 2 Teal) -->
  <g id="part-arms">
    <!-- Left Arm -->
    <path
      d="M 94 190 C 82 204, 82 226, 86 246 L 102 250 C 106 234, 106 214, 108 198 Z"
      fill="url(#grad-arms)" fill-opacity="0.92" stroke="#34d399" stroke-width="1.2"
    />
    <path
      d="M 86 246 C 74 260, 66 286, 68 308 L 90 324 C 94 304, 102 280, 102 250 Z"
      fill="url(#grad-arms)" fill-opacity="0.92" stroke="#34d399" stroke-width="1.2"
    />
    <!-- Right Arm -->
    <path
      d="M 226 190 C 238 204, 238 226, 234 246 L 218 250 C 214 234, 214 214, 212 198 Z"
      fill="url(#grad-arms)" fill-opacity="0.92" stroke="#34d399" stroke-width="1.2"
    />
    <path
      d="M 234 246 C 246 260, 254 286, 252 308 L 230 324 C 226 304, 218 280, 218 250 Z"
      fill="url(#grad-arms)" fill-opacity="0.92" stroke="#34d399" stroke-width="1.2"
    />
  </g>

  <!-- Legs Active (Picture 2 Violet) -->
  <g id="part-legs">
    <!-- Left Thigh -->
    <path
      d="M 120 302 C 112 322, 106 362, 114 404 C 120 424, 122 438, 122 450 L 140 450 C 144 434, 142 418, 142 418 C 138 390, 142 356, 158 334 L 140 310 C 130 306, 124 304, 120 302 Z"
      fill="url(#grad-legs)" fill-opacity="0.92" stroke="#c084fc" stroke-width="1.2"
    />
    <!-- Right Thigh -->
    <path
      d="M 200 302 C 208 322, 214 362, 206 404 C 200 424, 198 438, 198 450 L 180 450 C 176 434, 178 418, 178 418 C 182 390, 178 356, 162 334 L 180 310 C 190 306, 196 304, 200 302 Z"
      fill="url(#grad-legs)" fill-opacity="0.92" stroke="#c084fc" stroke-width="1.2"
    />
    <!-- Left Calf -->
    <path
      d="M 122 450 C 112 468, 112 502, 122 534 C 126 546, 126 558, 122 564 L 140 564 C 142 558, 140 554, 140 554 C 134 532, 138 500, 140 472 L 140 450 Z"
      fill="url(#grad-legs)" fill-opacity="0.92" stroke="#c084fc" stroke-width="1.2"
    />
    <!-- Right Calf -->
    <path
      d="M 198 450 C 208 468, 208 502, 198 534 C 194 546, 194 558, 198 564 L 180 564 C 178 558, 180 554, 180 554 C 186 532, 182 500, 180 472 L 180 450 Z"
      fill="url(#grad-legs)" fill-opacity="0.92" stroke="#c084fc" stroke-width="1.2"
    />
  </g>

  <!-- ── 3. MINIMAL INTERNAL ACCENT LINES ── -->
  <!-- Clavicles -->
  <path d="M 160 114 C 144 112, 124 112, 108 118 M 160 114 C 176 112, 196 112, 212 118"
        stroke="rgba(255,255,255,0.4)" stroke-width="1.4" stroke-linecap="round" fill="none" />

  <!-- Sternal Cleft -->
  <path d="M 160 114 L 160 172" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" />

  <!-- Core Linea Alba & Inguinal V-Line -->
  <path d="M 160 174 L 160 264" stroke="rgba(255,255,255,0.35)" stroke-width="1.2" />
  <path d="M 136 270 C 148 280, 156 284, 160 286 C 164 284, 172 280, 184 270"
        stroke="rgba(255,255,255,0.35)" stroke-width="1.2" fill="none" />
  <!-- Minimal 6-pack horizontal lines -->
  <path d="M 148 198 L 172 198 M 146 226 L 174 226 M 148 252 L 172 252"
        stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-linecap="round" />
</svg>`;

const resvg = new Resvg(svg);
fs.writeFileSync('public/test-one-outline.png', resvg.render().asPng());
console.log('Saved public/test-one-outline.png');
