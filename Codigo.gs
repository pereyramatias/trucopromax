function doGet(e) {
  var sheetJugadores = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Jugadores");
  var sheetPartidos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Partidos");
  
  if (!sheetJugadores || !sheetPartidos) {
    return ContentService.createTextOutput(JSON.stringify({error: "Faltan las pestañas 'Jugadores' o 'Partidos'"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Procesar Jugadores
  var dataJ = sheetJugadores.getDataRange().getValues();
  var players = [];
  var startJ = (dataJ.length > 0 && String(dataJ[0][0]).toLowerCase().includes("nombre")) ? 1 : 0;
  
  for (var i = startJ; i < dataJ.length; i++) {
    var nombre = dataJ[i][0];
    if (!nombre) continue;
    
    var jugados = Number(dataJ[i][2] || 0);
    var victorias = Number(dataJ[i][3] || 0);
    var winrate = jugados > 0 ? Math.round((victorias / jugados) * 100) : 0;
    
    players.push({
      nombre: String(nombre),
      puntos: Number(dataJ[i][1] || 0),
      jugados: jugados,
      victorias: victorias,
      derrotas: Number(dataJ[i][4] || 0),
      winrate: winrate,
      apodo: String(dataJ[i][6] || "") // Columna G
    });
  }
  
  // Ordenar de mayor a menor según puntos
  players.sort(function(a, b) { 
    if (b.puntos === a.puntos) return b.winrate - a.winrate;
    return b.puntos - a.puntos; 
  });

  // Procesar Partidos
  var dataP = sheetPartidos.getDataRange().getValues();
  var matches = [];
  var startP = (dataP.length > 0 && String(dataP[0][0]).toLowerCase().includes("fecha")) ? 1 : 0;
  
  for (var j = startP; j < dataP.length; j++) {
    var fecha = dataP[j][0];
    if (!fecha) continue;
    
    matches.push({
      fecha: fecha,
      teamA: String(dataP[j][1] || ""),
      teamB: String(dataP[j][2] || ""),
      ptsA: "",
      ptsB: "",
      winner: String(dataP[j][5] || ""),
      createdBy: String(dataP[j][6] || "") // Columna G (Auditor)
    });
  }

  return ContentService.createTextOutput(JSON.stringify({
    players: players,
    matches: matches
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheetJugadores = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Jugadores");
  var sheetPartidos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Partidos");
  
  if (!sheetJugadores || !sheetPartidos) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: "Faltan crear las pestañas"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    // Login Action
    if (action === 'login') {
      var pin = String(body.pin).trim();
      var data = sheetJugadores.getDataRange().getValues();
      var startJ = (data.length > 0 && String(data[0][0]).toLowerCase().includes("nombre")) ? 1 : 0;
      
      for (var i = startJ; i < data.length; i++) {
        var dbPin = String(data[i][5] || "").trim(); // Col F (Indice 5)
        if (dbPin !== "" && dbPin === pin) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true, 
            user: { nombre: String(data[i][0]), apodo: String(data[i][6] || "") }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({success: false, message: "PIN incorrecto o no asignado"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Edit Profile Action
    if (action === 'updateProfile') {
      var nombreUsuario = body.nombreUsuario;
      var newApodo = body.newApodo;
      var newPin = body.newPin;
      var data = sheetJugadores.getDataRange().getValues();
      var startJ = (data.length > 0 && String(data[0][0]).toLowerCase().includes("nombre")) ? 1 : 0;
      
      for (var i = startJ; i < data.length; i++) {
        if (String(data[i][0]) === String(nombreUsuario)) {
          var row = i + 1;
          if (newPin) sheetJugadores.getRange(row, 6).setValue(newPin); // Columna F (PIN)
          if (newApodo !== undefined) sheetJugadores.getRange(row, 7).setValue(newApodo); // Columna G (Apodo)
          return ContentService.createTextOutput(JSON.stringify({success: true, message: "Perfil actualizado"}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({success: false, message: "Usuario no encontrado"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Add Player Action
    if (action === 'addPlayer') {
      var name = body.name.trim();
      var data = sheetJugadores.getDataRange().getValues();
      var startJ = (data.length > 0 && String(data[0][0]).toLowerCase().includes("nombre")) ? 1 : 0;
      
      for (var i = startJ; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().toLowerCase() === name.toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({success: false, message: "El jugador ya existe"}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      // Nombre, Puntos, Jugados, Victorias, Derrotas, PIN ("0000"), Apodo ("")
      sheetJugadores.appendRow([name, 0, 0, 0, 0, "0000", ""]);
      return ContentService.createTextOutput(JSON.stringify({success: true, message: "Jugador agregado con PIN 0000"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Add Match Action
    if (action === 'addMatch') {
      var teamA = body.teamA || [];
      var teamB = body.teamB || [];
      var winner = body.winner;
      var createdBy = body.createdBy || "";

      // Fecha, TeamA, TeamB, PtsA(vacío), PtsB(vacío), Ganador, CreadoPor (Col G)
      sheetPartidos.appendRow([new Date(), teamA.join(", "), teamB.join(", "), "", "", winner, createdBy]);

      var data = sheetJugadores.getDataRange().getValues();
      var startJ = (data.length > 0 && String(data[0][0]).toLowerCase().includes("nombre")) ? 1 : 0;
      
      function updatePlayer(playerName, isWinner) {
        for (var i = startJ; i < data.length; i++) {
          if (String(data[i][0]).trim() === playerName.trim()) {
            var row = i + 1;
            var pts = Number(data[i][1] || 0) + (isWinner ? 1 : 0);
            var played = Number(data[i][2] || 0) + 1;
            var wins = Number(data[i][3] || 0) + (isWinner ? 1 : 0);
            var losses = Number(data[i][4] || 0) + (!isWinner ? 1 : 0);
            
            sheetJugadores.getRange(row, 2).setValue(pts);
            sheetJugadores.getRange(row, 3).setValue(played);
            sheetJugadores.getRange(row, 4).setValue(wins);
            sheetJugadores.getRange(row, 5).setValue(losses);
            break;
          }
        }
      }

      teamA.forEach(function(p) { updatePlayer(p, winner === 'A'); });
      teamB.forEach(function(p) { updatePlayer(p, winner === 'B'); });

      return ContentService.createTextOutput(JSON.stringify({success: true, message: "Partido guardado"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({success: false, message: "Acción inválida"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
