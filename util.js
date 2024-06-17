export class WebGLUtils {

  getGLContext = (canvas) => {
    const gl = canvas.getContext("webgl2");
    //0.0 -> 1.0
    gl.clearColor(1.0, 0.0, 1.0, 1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    return gl;
  };

  getShader = (gl, shaderSource, shaderType) => {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  getProgram = (gl, vertexShaderSource, fragmentShaderSource) => {
    var vs = this.getShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    var fs = this.getShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  };

  createAndBindBuffer = (gl, bufferType, typeOfDrawing, data) => {
    var buffer = gl.createBuffer();
    gl.bindBuffer(bufferType, buffer);
    gl.bufferData(bufferType, data, typeOfDrawing);
    gl.bindBuffer(bufferType, null);
    return buffer;
  };

  createAndBindTexture = (gl, image) => {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  };

  createAndBindFramebuffer = (gl, image) => {
    var texture = this.createAndBindTexture(gl, image);
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb: framebuffer, tex: texture };
  };

  linkGPUAndCPU = (gl, obj) => {
    var position = gl.getAttribLocation(obj.program, obj.gpuVariable);
    gl.enableVertexAttribArray(position);
    gl.bindBuffer(obj.channel || gl.ARRAY_BUFFER, obj.buffer);
    gl.vertexAttribPointer(
      position,
      obj.dims,
      obj.dataType || gl.FLOAT,
      obj.normalize || gl.FALSE,
      obj.stride || 0,
      obj.offset || 0
    );
    return position;
  };

  //-1.0 -> 1.0 -> 0.0->1.0
  //0.0->1.0 -> 0.0->2.0
  //1.0 -> -1.0->1.0
  getGPUCoords = (obj) => {
    return {
      startX: -1.0 + (obj.startX / gl.canvas.width) * 2,
      startY: -1.0 + (obj.startY / gl.canvas.height) * 2,
      endX: -1.0 + (obj.endX / gl.canvas.width) * 2,
      endY: -1.0 + (obj.endY / gl.canvas.height) * 2,
    };
  };

  //Input -> -1.0 -> 1.0
  //Output -> 0.0 -> 2.0
  getGPUCoords0To2 = (obj) => {
    return {
      startX: 1.0 + obj.startX,
      startY: 1.0 + obj.startY,
      endX: 1.0 + obj.endX,
      endY: 1.0 + obj.endY,
    };
  };

  getTextureColor = (obj) => {
    return {
      red: obj.startX / gl.canvas.width,
      green: obj.startY / gl.canvas.height,
      blue: obj.endX / gl.canvas.width,
      alpha: obj.endY / gl.canvas.height,
    };
  };

  getCircleCoordinates = (centerX, centerY, radiusX, numOfPoints, isLine) => {
    var circleCoords = [];
    var radiusY = (radiusX / gl.canvas.height) * gl.canvas.width;
    for (var i = 0; i < numOfPoints; i++) {
      //2*Math.PI*r
      var circumference = 2 * Math.PI * (i / numOfPoints);
      var x = centerX + radiusX * Math.cos(circumference);
      var y = centerY + radiusY * Math.sin(circumference);
      if (isLine) {
        circleCoords.push(centerX, centerY);
      }
      circleCoords.push(x, y);
    }
    return circleCoords;
  };

  prepareRectVec2 = (startX, startY, endX, endY) => {
    return [
      startX,
      startY,
      endX,
      startY,
      startX,
      endY,
      startX,
      endY,
      endX,
      endY,
      endX,
      startY,
    ];
  };

  getAspectRatio = (gl, img) => {
    var cols = img.width;
    var rows = img.height;
    var imageAR = cols / rows;
    var canvasAR = gl.canvas.width / gl.canvas.height;
    var startX, startY, renderableW, renderableH;
    if (imageAR < canvasAR) {
      renderableH = gl.canvas.height;
      renderableW = cols * (renderableH / rows);
      startX = (gl.canvas.width - renderableW) / 2;
      startY = 0;
    } else if (imageAR > canvasAR) {
      renderableW = gl.canvas.width;
      renderableH = rows * (renderableW / cols);
      startX = 0;
      startY = (gl.canvas.height - renderableH) / 2;
    } else {
      startX = 0;
      startY = 0;
      renderableW = gl.canvas.width;
      renderableH = gl.canvas.height;
    }
    return {
      x1: startX,
      y1: startY,
      x2: startX + renderableW,
      y2: startY + renderableH,
    };
  };
  orthographic = (left, right, bottom, top, near, far, dst) => {
    dst = dst || new Float32Array(16);

    dst[0] = 2 / (right - left);
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;
    dst[4] = 0;
    dst[5] = 2 / (top - bottom);
    dst[6] = 0;
    dst[7] = 0;
    dst[8] = 0;
    dst[9] = 0;
    dst[10] = 2 / (near - far);
    dst[11] = 0;
    dst[12] = (left + right) / (left - right);
    dst[13] = (bottom + top) / (bottom - top);
    dst[14] = (near + far) / (near - far);
    dst[15] = 1;

    return dst;
  }
  drawText = (gl, program, fontInfo, text, x, y, scale, positionBuffer, texcoordBuffer, matrixLocation, textureLocation) => {
    const positions = [];
    const texcoords = [];
    let offsetX = x;

    for (const letter of text) {
      const glyphInfo = fontInfo.glyphInfos[letter];
      if (glyphInfo) {
        const x2 = offsetX + glyphInfo.width * scale;
        const y2 = y + fontInfo.letterHeight * scale;

        positions.push(
          offsetX, y, x2, y, offsetX, y2,
          offsetX, y2, x2, y, x2, y2
        );

        const u1 = glyphInfo.x / fontInfo.textureWidth;
        const v1 = glyphInfo.y / fontInfo.textureHeight;
        const u2 = (glyphInfo.x + glyphInfo.width) / fontInfo.textureWidth;
        const v2 = (glyphInfo.y + fontInfo.letterHeight) / fontInfo.textureHeight;

        texcoords.push(u1, v1, u2, v1, u1, v2, u1, v2, u2, v1, u2, v2);

        offsetX += (glyphInfo.width + fontInfo.spacing) * scale;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

    gl.useProgram(program);

    const projectionMatrix = this.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    gl.uniformMatrix4fv(matrixLocation, false, projectionMatrix);
    gl.uniform1i(textureLocation, 0);

    gl.drawArrays(gl.TRIANGLES, 0, text.length * 6);
  }

}
