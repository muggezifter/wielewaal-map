
(function(){
    const pointerLayer = document.getElementById("pointer");
    const LOG_LENGTH = 5;
    loadData(); 

    var cnt = 0;

    function loadData() {
        getGridData("G0004");
        //setInterval(()=>log("hallo" + cnt++),1000);
    } 

    function  getGridData(gridId) {
        $.getJSON("/grid/find?grid_id=" + gridId + "&callback=?")
        .done( (data) => {
            currentGrid = data[0];
            log("loaded grid: " + currentGrid.name);
            getRecordings(gridId);
        });
    }

    function  getRecordings(gridId)  {
        $.getJSON("/recording/list?grid_id=" + gridId + "&callback=?")
        .done(function (data) {
            const recordings = data.filter((rec) => rec.description.length>1);
            log("found " + recordings.length + " recordings");
            for (var rec of recordings) {
                log(rec.recording_id + ": " + rec.description);
            }
            addOptions("select#play_select",recordings,"description", "recording_id");
        });
    }

    function  addOptions(select,data,name,value)  {
        log("populating dropdown... done")
        $(select)
            .children(".dynamic")
            .remove();
        for (var item of data) {
            $(select).append(
                    $('<option>', { class: "dynamic", value:item[value] })
                    .text(item[name])
            );
        }  
    };

    var messages = [];
    function log(message) {
        messages.push(message);
        messages = messages.slice(0-LOG_LENGTH);
        document.getElementById("log").innerHTML = messages.reduce(
            (acc,val) => acc + "<li>" + val + "</li>",
        "");
        //console.log(messages);
    }
            
    function removeChildren(parent) {
        while(parent.firstChild) {
            console.log(parent.firstChild);
            parent.removeChild(parent.firstChild);
        }
    }
        
    function resetAllPoints() {
        const points = document.getElementsByClassName("pointer last");
        for (var point of points){
            point.classList.remove("last");
        }
    }
})()