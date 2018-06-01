
(function(){
    const POINTER_LAYER = document.getElementById('pointer');
    const MAP_DIV = document.getElementById('map');
    const LOG_LENGTH = 10;

    //const SVG_W = 159.515
    //const SVG_H = 164.72
    const SVG_H = 159.515;
    const SVG_W = 164.7;

    const MIN_LAT = 51.87535;
    const MAX_LAT = 51.885209;

    const MIN_LON = 4.45263;
    const MAX_LON = 4.469102;

    //const MIN_LAT = 51.87535;
    //const MAX_LAT = 51.885209;
    //const MIN_LON = 4.45263;
    //const MAX_LON = 4.469102;


    const LAT_H = MAX_LAT - MIN_LAT;
    const LON_W = MAX_LON - MIN_LON;

    var messages = [];
    var currentTrack = [];
    var lastIndex = 0;
    var currentIndex = 0;
    var pausedIndex = 0;
    var timeOut = null;
    var speed = 1;
    var volume = 1 
    var bearing = 0;
    var logInConsole = true;


    loadData(); 

    $("#btn_play").prop("disabled", true).click(btnPlayClickHandler);
    $("#btn_pause").prop("disabled", true).click(btnPauseClickHandler);
    $("#btn_stop").prop("disabled", true).click(btnStopClickHandler);
    
    $('#select_recs').change(selectRecsChangeHandler);
    $('#select_speed').change(selectSpeedChangeHandler);

    function selectRecsChangeHandler() {
        btnStopClickHandler();
        $('#select_recs').children('.default').remove();
        log("recording selected: " + $('#select_recs').find(":selected").text());
        $.getJSON('/recording/find?rec_id=' + $('#select_recs').val() + '&callback=?').done( (data) => {
            currentTrack = data;
            lastIndex = Math.max(0,currentTrack.length-1);
            $("#btn_play").prop("disabled", false);
            log("recording " + $('#select_recs').val() + " retrieved");
        });
    }

    function selectSpeedChangeHandler() {
        speed = $('#select_speed').val();
    }

    function btnPlayClickHandler() {
        $("#btn_play").prop("disabled", true);
        $("#btn_pause").prop("disabled", false);
        $("#btn_stop").prop("disabled", false);
        if (pausedIndex > 0) {
            log("resume playback");
            playNext(pausedIndex);
            pausedIndex = 0;
        } else {
            removeAllPoints()
            playNext(1);
        }
    }

    function btnPauseClickHandler() {
        $("#btn_play").prop("disabled", false);
        $("#btn_pause").prop("disabled", true);
        $("#btn_stop").prop("disabled", false);
        clearTimeout(timeOut);
        pausedIndex = currentIndex;
        log("playback paused");
    }

    function btnStopClickHandler() {
        $("#btn_play").prop("disabled", false);
        $("#btn_pause").prop("disabled", true);
        $("#btn_stop").prop("disabled", true);
        clearTimeout(timeOut);
        resetHistogram();
        pausedIndex = 0;
        currentIndex = 0;
        log("stop playback");
    }

    function getBearing(lat, lon, latNxt, lonNxt) {     
        
        start_latitude  = lat * Math.PI / 180;
        start_longitude = lon * Math.PI / 180;
        stop_latitude   = latNxt * Math.PI / 180;
        stop_longitude  = lonNxt * Math.PI / 180;

        var y = Math.sin(stop_longitude-start_longitude) * Math.cos(stop_latitude);
        var x = Math.cos(start_latitude)*Math.sin(stop_latitude) -
                Math.sin(start_latitude)*Math.cos(stop_latitude)*Math.cos(stop_longitude-start_longitude);
        return Math.atan2(y, x) * 180 / Math.PI;
    }

    function playNext(index) {
        currentIndex = index;
        const pnt = currentTrack[index];
        resetAllPoints();
        drawPoint(pnt);
        playChord(pnt.chord);
        log("point " + index  +", " + pnt.date);
        log(pnt.chord.map((val)=>"note: " + midi2note(val.note) + ", vel: " + val.velocity).join(" | "));
        if (index < lastIndex) {
            // get interval
            const nxt = currentTrack[index + 1];
            const dNow = new Date(pnt.date);
            const dNxt = new Date(nxt.date);
            const interval = Math.min(15000,(dNxt - dNow))/speed;
            // bearing
            //bearing = getBearing(pnt.lat,pnt.lon, nxt.lat, nxt.lon)
            timeOut = setTimeout(() => playNext(index+1), interval);
        } else {
            btnStopClickHandler();
            log("end");
        }
    }



    function drawPoint(point) {
        //console.log(point);
        const x = SVG_W * (parseFloat(point.lon) - MIN_LON)/LON_W
        const y = SVG_H - (SVG_H * (parseFloat(point.lat) - MIN_LAT)/LAT_H )
        //print '<circle cx="'+ str(x) + '" cy="'+ str(y) +'" r="0.6" class="node" id="midi' + note + '" />'

        const c = document.createElementNS('http://www.w3.org/2000/svg',"circle");
        c.setAttribute("r", "0.8");
        c.setAttribute("cx",x);
        c.setAttribute("cy",y);
        c.setAttribute("id",point.id)
        c.classList.add("pointer");
        c.classList.add("last")
        POINTER_LAYER.appendChild(c);
    }

    function playChord(chord) {
        histogram(chord);
        setClasses(chord);
        for (var n of chord) {
            $.getJSON("/play?n=" + n.note + "&v=" + volume*n.velocity + "&callback=?").done(function (data) {
                logInConsole && console.log(data);
            });
        }
    }

    function loadData() {
        getGridData('G0004');
    } 

    function setClasses(chord) {
        const classList = chord.map((val)=>"m" + val.note).join(' ');
        MAP_DIV.classList = classList;
    }

    function histogram(chord) {
        resetHistogram();
        for (var n of chord) {
            $("#bar" + n.note).css("display","inline-block").find(".fill").css("height",(100 * n.velocity/127)+"%");
        }
    }

    function resetHistogram() {
        $(".bar").css("display","none");
    }


    function getGridData(gridId) {
        $.getJSON('/grid/find?grid_id=' + gridId + '&callback=?')
        .done( (data) => {
            currentGrid = data[0];
            log('loaded grid: ' + currentGrid.name);
            getRecordings(gridId);
        });
    }

    function getRecordings(gridId)  {
        $.getJSON('/recording/list?grid_id=' + gridId + '&callback=?')
        .done(function (data) {
            const recordings = data.filter((rec) => rec.description.length>1);
            log('found ' + recordings.length + ' recordings');
            for (var rec of recordings) {
                log(rec.recording_id + ': ' + rec.description);
            }
            addOptions('select#select_recs',recordings,'description', 'recording_id');
        });
    }

    function addOptions(select,data,name,value)  {
        log('populating dropdown')
        for (var item of data) {
            $(select).append(
                    $('<option>', { value:item[value] })
                    .text(item[name])
            );
        } 

    };


    function log(message) {
        messages.push('' + message);
        messages = messages.slice(0-LOG_LENGTH);
        document.getElementById('log').innerHTML = messages.reduce(
            (acc,val) => acc + '<li>' + val + '</li>',
        '');

    }

            
    function removeAllPoints() {
        while(POINTER_LAYER.firstChild) {
            //console.log(parent.firstChild);
            POINTER_LAYER.removeChild(POINTER_LAYER.firstChild);
        }
    }
        
    function resetAllPoints() {
        const points = document.getElementsByClassName('pointer last');
        for (var point of points){
            point.classList.remove('last');
            point.setAttribute("r","0.5");
        }
    }

    function midi2note(midi) {
        return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 
        'G', 'G#', 'A', 'A#', 'B'][midi % 12] 
    }
})()