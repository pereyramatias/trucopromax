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
  for (var i = 1; i < dataJ.length; i++) {
    var nombre = dataJ[i][0];
    if (!nombre) continue; // Evitar filas vacías
    
    var jugados = Number(dataJ[i][2] || 0);
    var victorias = Number(dataJ[i][3] || 0);
    var winrate = jugados > 0 ? Math.round((victorias / jugados) * 100) : 0;
    
    players.push({
      nombre: nombre,
      puntos: Number(dataJ[i][1] || 0),
      jugados: jugados,
      victorias: victorias,
      derrotas: Number(dataJ[i][4] || 0),
      winrate: winrate
    });
  }
  
  // Ordenar de mayor a menor según puntos
  players.sort(function(a, b) { 
    if (b.puntos === a.puntos) {
      return b.winrate - a.winrate; // Desempate por winrate
    }
    return b.puntos - a.puntos; 
  });

  // Procesar Partidos
  var dataP = sheetPartidos.getDataRange().getValues();
  var matches = [];
  // Asumimos: Fecha, Equipo A, Equipo B, Puntos A, Puntos B, Ganador
  for (var j = 1; j < dataP.length; j++) {
    var fecha = dataP[j][0];
    if (!fecha) continue;
    
    matches.push({
      fecha: fecha,
      teamA: dataP[j][1],
      teamB: dataP[j][2],
      ptsA: dataP[j][3] !== undefined ? dataP[j][3] : "",
      ptsB: dataP[j][4] !== undefined ? dataP[j][4] : "",
      winner: dataP[j][5] || (dataP[j][3] > dataP[j][4] ? 'A' : 'B') // Fallback si no hay ganador guardado
    });
  }

  // Objeto de respuesta unificada
  var responsePayload = {
    players: players,
    matches: matches
  };

  return ContentService.createTextOutput(JSON.stringify(responsePayload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheetJugadores = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Jugadores");
  var sheetPartidos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Partidos");
  
  if (!sheetJugadores || !sheetPartidos) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: "Faltan crear las pestañas 'Jugadores' o 'Partidos'"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === 'addPlayer') {
      var name = body.name.trim();
      var data = sheetJugadores.getDataRange().getValues();
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().toLowerCase() === name.toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({success: false, message: "El jugador ya existe maestro"}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      sheetJugadores.appendRow([name, 0, 0, 0, 0]); // Nombre, Puntos, Jugados, Victorias, Derrotas
      return ContentService.createTextOutput(JSON.stringify({success: true, message: "Jugador agregado"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'addMatch') {
      var teamA = body.teamA || [];
      var teamB = body.teamB || [];
      var winner = body.winner;
      var ptsA = body.ptsA !== undefined ? body.ptsA : "";
      var ptsB = body.ptsB !== undefined ? body.ptsB : "";

      // Registrar en el historial de partidos (6 columnas)
      sheetPartidos.appendRow([new Date(), teamA.join(", "), teamB.join(", "), ptsA, ptsB, winner]);

      var data = sheetJugadores.getDataRange().getValues();
      
      // Actualizar a los jugadores
      function updatePlayer(playerName, isWinner) {
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === playerName) {
            var row = i + 1;
            var pts = Number(data[i][1] || 0) + (isWinner ? 3 : 1);
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

      return ContentService.createTextOutput(JSON.stringify({success: true, message: "Partido guardado en el historial y stats actualizadas"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({success: false, message: "Acción inválida"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
