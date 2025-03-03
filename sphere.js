// Sphere.js
class Sphere {
  constructor({
    radius = 1.0,
    latSegments = 20,
    longSegments = 20,
  } = {}) {
    this.radius = radius;
    this.latSegments = latSegments;
    this.longSegments = longSegments;
    this.matrix = new Matrix4();

    // For texturing
    this.textureNum = -2;  // default: plain color, or pick a texture index

    // Initialize buffers once (static)
    Sphere.initSphereGeometry(radius, latSegments, longSegments);
  }

  // Build position/normal/UV data for a sphere
  static initSphereGeometry(radius, latCount, longCount) {
    if (Sphere.positionBuffer) return;

    // Arrays to hold raw float data
    let positions = [];
    let normals   = [];
    let uvs       = [];


    for (let i = 0; i < latCount; i++) {
      // phi0, phi1 are the polar angles (0 = top, pi = bottom)
      let phi0 = Math.PI * (i    ) / latCount;
      let phi1 = Math.PI * (i + 1) / latCount;

      for (let j = 0; j <= longCount; j++) {
        // theta goes around the sphere 0..2π
        let theta = 2.0 * Math.PI * j / longCount;

        // First point (phi0, theta) in band i
        let x0 = Math.sin(phi0) * Math.cos(theta);
        let y0 = Math.cos(phi0);
        let z0 = Math.sin(phi0) * Math.sin(theta);

        positions.push(radius*x0, radius*y0, radius*z0);
        normals.push(x0, y0, z0);

        let u0 = j / longCount;
        let v0 = i / latCount;
        uvs.push(u0, v0);

        let x1 = Math.sin(phi1) * Math.cos(theta);
        let y1 = Math.cos(phi1);
        let z1 = Math.sin(phi1) * Math.sin(theta);

        positions.push(radius*x1, radius*y1, radius*z1);
        normals.push(x1, y1, z1);

        let u1 = j / longCount;
        let v1 = (i + 1) / latCount;
        uvs.push(u1, v1);
      }
    }

    // Convert to Float32Array
    Sphere.vertPositions = new Float32Array(positions);
    Sphere.vertNormals   = new Float32Array(normals);
    Sphere.vertUVs       = new Float32Array(uvs);

    // Create GPU buffers
    Sphere.positionBuffer = worldGL.createBuffer();
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Sphere.positionBuffer);
    worldGL.bufferData(worldGL.ARRAY_BUFFER, Sphere.vertPositions, worldGL.STATIC_DRAW);

    Sphere.normalBuffer = worldGL.createBuffer();
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Sphere.normalBuffer);
    worldGL.bufferData(worldGL.ARRAY_BUFFER, Sphere.vertNormals, worldGL.STATIC_DRAW);

    Sphere.uvBuffer = worldGL.createBuffer();
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Sphere.uvBuffer);
    worldGL.bufferData(worldGL.ARRAY_BUFFER, Sphere.vertUVs, worldGL.STATIC_DRAW);

    Sphere.numVertices = (longCount + 1) * 2 * latCount;
  }

  // Draw function, similar to drawCube()
  drawSphere() {
    // Model matrix
    worldGL.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
  
    // Positions
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Sphere.positionBuffer);
    worldGL.vertexAttribPointer(a_Position, 3, worldGL.FLOAT, false, 0, 0);
    worldGL.enableVertexAttribArray(a_Position);
  
    // Normals
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Sphere.normalBuffer);
    worldGL.vertexAttribPointer(a_Normal, 3, worldGL.FLOAT, false, 0, 0);
    worldGL.enableVertexAttribArray(a_Normal);
  
    // UVs
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Sphere.uvBuffer);
    worldGL.vertexAttribPointer(a_UV, 2, worldGL.FLOAT, false, 0, 0);
    worldGL.enableVertexAttribArray(a_UV);
  
    // Select texture or color
    worldGL.uniform1i(u_whichTexture, this.textureNum);
  
    // *** Add this: set u_FragColor if using -2 for “plain color”
    if (this.textureNum == -2) {
      // Make sure you actually have this.baseColor
      worldGL.uniform4f(u_FragColor,
                        this.baseColor[0],
                        this.baseColor[1],
                        this.baseColor[2],
                        this.baseColor[3]);
    }
  
    // Now draw each “lat band” as a TRIANGLE_STRIP
    let vertsPerStrip = (this.longSegments + 1) * 2;
    for (let i = 0; i < this.latSegments; i++) {
      let start = i * vertsPerStrip;
      worldGL.drawArrays(worldGL.TRIANGLE_STRIP, start, vertsPerStrip);
    }
  }
}
