"use strict";

const vertexShaderSource = `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;
uniform mat4 u_matrix;
out vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec2 v_texcoord;
uniform sampler2D u_texture;
out vec4 outColor;

void main() {
  outColor = texture(u_texture, v_texcoord);
}`;

const utils = new WebGLUtils();
function main() {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl2");

  if (!gl) {
    console.error("WebGL2 not supported");
    return;
  }

  const utils = new WebGLUtils(gl);
  const program = utils.getProgram(gl, vertexShaderSource, fragmentShaderSource);

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord");
  const matrixLocation = gl.getUniformLocation(program, "u_matrix");
  const textureLocation = gl.getUniformLocation(program, "u_texture");

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.enableVertexAttribArray(texcoordAttributeLocation);
  gl.vertexAttribPointer(texcoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const image = new Image();
  image.src = "font.png";
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    drawScene();
    setInterval(drawScene, 300);
  };

  const cryptoLabel = "Binance/BNBUSDC";

  function getRandomPrice() {
    return (Math.random() * (500 - 300) + 300).toFixed(2);
  }

  function drawCryptoLabel() {
    const scale = 0.8;
    const textWidth = cryptoLabel.split("").reduce((sum, letter) => {
      const glyphInfo = fontInfo.glyphInfos[letter];
      return sum + (glyphInfo ? glyphInfo.width + fontInfo.spacing : 0);
    }, 0) * scale;

    const textHeight = fontInfo.letterHeight * scale;
    const x = (canvas.width - textWidth) / 2;
    const y = canvas.height - textHeight;

    utils.drawText(gl, program, fontInfo, cryptoLabel, x, y, scale, positionBuffer, texcoordBuffer, matrixLocation, textureLocation);
  }

  function drawCryptoPrice() {
    const scale = 1.3;
    const priceText = getRandomPrice();
    const priceTextWidth = priceText.split("").reduce((sum, letter) => {
      const glyphInfo = fontInfo.glyphInfos[letter];
      return sum + (glyphInfo ? glyphInfo.width + fontInfo.spacing : 0);
    }, 0) * scale;
    const x = (canvas.width - priceTextWidth) / 2;
    const y = (canvas.height - fontInfo.letterHeight * scale)- 80;

    utils.drawText(gl, program, fontInfo, priceText, x, y, scale, positionBuffer, texcoordBuffer, matrixLocation, textureLocation);
  }

  function drawScene() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawCryptoLabel();
    drawCryptoPrice();
  }
}
function graph() {
  const vertexShader = `#version 300 es
  precision mediump float;
  in vec2 position;
  void main () {
      gl_Position = vec4(position, 0.0, 1.0);
  }`;

  const fragmentShader = `#version 300 es
  precision highp float;
  uniform vec2 canvasSize;
  out vec4 outColor;
  void main() {
      float alpha = gl_FragCoord.y / canvasSize.y;
      outColor = vec4(0.671, 0.125, 0.204, alpha);
  }`;

  const lineFragmentShader = `#version 300 es
  precision highp float;
  out vec4 outColor;
  void main() {
      outColor = vec4(0.925, 0.176, 0.361, 1.0);
  }`;
  const canvas = document.getElementById("graphCanvas");
  const gl = utils.getGLContext(canvas);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


  let heights = [
    43500
  ];
  let [triangleCoords, extendedHeights] = generateTriangleCoords(heights, true);
  let lineCoords = generateLineCoords(extendedHeights, 8 / canvas.height);

  const program = utils.getProgram(gl, vertexShader, fragmentShader);
  const lineProgram = utils.getProgram(gl, vertexShader, lineFragmentShader);

  let coordBuffer = utils.createAndBindBuffer(
    gl,
    gl.ARRAY_BUFFER,
    gl.STATIC_DRAW,
    new Float32Array(triangleCoords)
  );
  let lineBuffer = utils.createAndBindBuffer(
    gl,
    gl.ARRAY_BUFFER,
    gl.STATIC_DRAW,
    new Float32Array(lineCoords)
  );

  gl.useProgram(program);

  const canvasSizeLocation = gl.getUniformLocation(program, "canvasSize");
  gl.uniform2f(canvasSizeLocation, canvas.width, canvas.height);

  const position = utils.linkGPUAndCPU(
    gl,
    {
      program: program,
      gpuVariable: "position",
      buffer: coordBuffer,
      dims: 2,
    }
  );

  gl.useProgram(lineProgram);

  const linePosition = utils.linkGPUAndCPU(
    gl,
    {
      program: lineProgram,
      gpuVariable: "position",
      buffer: lineBuffer,
      dims: 2,
    }
  );

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  function drawScene() {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, coordBuffer);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, triangleCoords.length / 2);

    gl.useProgram(lineProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.vertexAttribPointer(linePosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(linePosition);

    for (let i = 0; i < lineCoords.length / 8; i++) {
      gl.drawArrays(gl.TRIANGLE_STRIP, i * 4, 4);
    }
  }

  function generateNewHeight(previousHeight) {
    const change = previousHeight * 0.00000000001;
    const newHeight = previousHeight + (Math.random() * 2 - 1) * change;
    return Math.max(0, newHeight); 
  }

  function updateData() {
    const lastHeight = heights[heights.length - 1];
    const newHeight = generateNewHeight(lastHeight);
    heights.push(newHeight);
    if (heights.length > 40) {
      heights.shift();
    }
    [triangleCoords, extendedHeights] = generateTriangleCoords(heights);
    lineCoords = generateLineCoords(extendedHeights, 4 / canvas.height);

    coordBuffer = utils.createAndBindBuffer(
      gl,
      gl.ARRAY_BUFFER,
      gl.STATIC_DRAW,
      new Float32Array(triangleCoords)
    );
    lineBuffer = utils.createAndBindBuffer(
      gl,
      gl.ARRAY_BUFFER,
      gl.STATIC_DRAW,
      new Float32Array(lineCoords)
    );
  }

  function animate() {
    drawScene();
    setTimeout(() => {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      updateData();
      requestAnimationFrame(animate);
    }, 300);
  }

  animate();

  function generateTriangleCoords(heights, smoothCorners = false) {
    let extendedHeights = [];

    if (smoothCorners) {
      for (let i = 0; i < heights.length - 1; i++) {
        let currentHeight = heights[i];
        let nextHeight = heights[i + 1];
        let middleHeight = nextHeight - currentHeight;

        middleHeight =
          nextHeight > currentHeight
            ? middleHeight * 0.7
            : middleHeight - middleHeight * 0.7;

        extendedHeights.push(currentHeight);
        extendedHeights.push(middleHeight + currentHeight);
      }
      extendedHeights.push(heights[heights.length - 1]);
    } else {
      extendedHeights = heights;
    }

    const minHeight = Math.min(...extendedHeights);
    const maxHeight = Math.max(...extendedHeights);
    const normalizedHeights = extendedHeights.map(
      (height) => ((height - minHeight) / (maxHeight - minHeight)) * 2 - 1
    );

    const triangleCoords = [];
    let xCoord = -1.0;
    const xStep = 2.0 / (normalizedHeights.length - 1);

    for (let i = 0; i < normalizedHeights.length; i++) {
      triangleCoords.push(xCoord, -1.0);
      triangleCoords.push(xCoord, normalizedHeights[i]);
      xCoord += xStep;
    }

    return [triangleCoords, extendedHeights];
  }

  function generateLineCoords(heights, lineWidth) {
    const lineCoords = [];
    const xStep = 2.0 / (heights.length - 1);
    const halfWidth = lineWidth / 2;
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);

    for (let i = 0; i < heights.length - 1; i++) {
      const x1 = -1.0 + i * xStep;
      const y1 = ((heights[i] - minHeight) / (maxHeight - minHeight)) * 2 - 1;
      const x2 = x1 + xStep;
      const y2 = ((heights[i + 1] - minHeight) / (maxHeight - minHeight)) * 2 - 1;

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const sin = Math.sin(angle) * halfWidth;
      const cos = Math.cos(angle) * halfWidth;

      lineCoords.push(x1 - sin, y1 + cos);
      lineCoords.push(x1 + sin, y1 - cos);
      lineCoords.push(x2 - sin, y2 + cos);
      lineCoords.push(x2 + sin, y2 - cos);
    }

    return lineCoords;
  }
}

const fpsElem = document.querySelector("#fps");

let then = 0;
function render(now) {
  now *= 0.001;
  const deltaTime = now - then;
  then = now;
  const fps = 1 / deltaTime;
  fpsElem.textContent = fps.toFixed(1);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

main();
graph();