var canvas;
var gl;

var direction = 0;
var points = [];
var colors = [];

var theta = [ 0, 0, 0 ];

var thetaLoc;

var flag = true;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var left = -1.0;
var right = 1.0;
var top = 1.0;
var bottom = -1.0
var near = -100;
var far = 100;
var ambientProduct;
var diffuseProduct;
var specularProduct;
var texSize = 64;

// Create a checkerboard pattern using floats

    
var image1 = new Array()
    for (var i =0; i<texSize; i++)  image1[i] = new Array();
    for (var i =0; i<texSize; i++) 
        for ( var j = 0; j < texSize; j++) 
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [c, c, c, 1];
    }

// Convert floats to ubytes for texture

var image2 = new Uint8Array(4*texSize*texSize);

    for ( var i = 0; i < texSize; i++ ) 
        for ( var j = 0; j < texSize; j++ ) 
           for(var k =0; k<4; k++) 
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];
        
var texCoordsArray = [];
var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
	makeShape( 4, 5, 6, 7 );
	makeShape( 8, 5, 4, 8 );
	makeShape( 5, 6, 8, 5 );	
	makeShape( 7, 4, 8, 7 );
	makeShape( 6, 7, 8, 6 );
	makeShape( 0, 1, 2, 3 );
	makeShape( 8, 1, 0, 8 );
	makeShape( 1, 2, 8, 1 );
	makeShape( 2, 3, 8, 2 );
	makeShape( 3, 0, 8, 3 );
	
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
	
	ambientProduct = mult(lightAmbient, materialAmbient);
	diffuseProduct = mult(lightDiffuse, materialDiffuse);
	specularProduct = mult(lightSpecular, materialSpecular);
	gl.uniform4fv(gl.getUniformLocation(program,"ambientProduct"), flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(program,"diffuseProduct"), flatten(diffuseProduct) );
	gl.uniform4fv(gl.getUniformLocation(program,"specularProduct"), flatten(specularProduct) );
	gl.uniform4fv(gl.getUniformLocation(program,"lightPosition"), flatten(lightPosition) );
	gl.uniform1f(gl.getUniformLocation(program,"shininess"),materialShininess);
	
	var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
	
	// Load the data into the GPU
	
	var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

	var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );
    
	var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    configureTexture(image2);	
	
	thetaLoc = gl.getUniformLocation(program, "theta");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    projectionMatrix = ortho(left, right, bottom, top, near, far);
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
	
    // Event Listener
	document.addEventListener("keydown",function () {
		if (event.keyCode == 37){ // Left - counterclockwise around Y axis
		direction = 1;
		}
		else if (event.keyCode == 40){ // Down - clockwise around X axis
		direction = 2;
		}
		else if (event.keyCode == 39){  // Right - clockwise around Y axis
		direction = 3;
		}
		else if (event.keyCode == 38){ // Up - counterclockwise around X axis
		direction = 4;
		}
		else {}
    });
    
    render();
};

function configureTexture(image) {
    texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, 
        gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

function makeShape(a,b,c,d){
    var vertices = [
        vec4( -0.5, -0.5,  1.0, 1.0 ),
        vec4( -0.5,  0.5,  1.0, 1.0 ),
        vec4(  0.5,  0.5,  1.0, 1.0 ),
        vec4(  0.5, -0.5,  1.0, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 ),
		vec4(  0.0,  0.0,  0.5, 1.0)
    ];
	var vertexColors = [
        [ 0.5, 0.0, 0.0, 1.0 ],
        [ 1.0, 0.0, 0.0, 1.0 ],
        [ 1.0, 0.5, 0.5, 1.0 ],
        [ 0.0, 1.0, 0.0, 1.0 ],
        [ 0.0, 0.0, 1.0, 1.0 ],
        [ 1.0, 0.0, 1.0, 1.0 ],
        [ 0.0, 1.0, 1.0, 1.0 ],
        [ 1.0, 1.0, 0.0, 1.0 ],
		[ 1.0, 0.5, 0.0, 1.0 ]
    ];

	var indices = [ a, b, c, a, c, d ];
	for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );        
		colors.push(vertexColors[a]);
	}
	texCoordsArray.push(texCoord[0]);
	texCoordsArray.push(texCoord[1]);
	texCoordsArray.push(texCoord[2]);
	texCoordsArray.push(texCoord[0]);
	texCoordsArray.push(texCoord[2]);
	texCoordsArray.push(texCoord[3]);
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	if (direction == 1){
	theta[1] += 2;
	}
	else if (direction == 2){
	theta[0] += 2;
	}
	else if (direction == 3){
	theta[1] -= 2;
	}
	else if (direction == 4){
	theta[0] -= 2;
	}
	else {}
	
	modelViewMatrix = mat4();
	modelView = mult(modelViewMatrix, rotate(theta[0], [1, 0, 0] ));
    modelView = mult(modelViewMatrix, rotate(theta[1], [0, 1, 0] ));
    modelView = mult(modelViewMatrix, rotate(theta[2], [0, 0, 1] ));
	gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
	console.log(modelViewMatrix);
	gl.uniform3fv(thetaLoc, theta);
	gl.drawArrays( gl.TRIANGLES, 0, 60 );
	requestAnimFrame( render );
}
