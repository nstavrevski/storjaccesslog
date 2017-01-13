// access log data array for filling in info box
var accessLogData = [];

// DOM Ready =============================================================
$(document).ready(function() {
    console.log("trying to populate table");
    // Populate the log table on initial page load
    $body = $("body");
    $body.addClass("loading");
    populateTable();

});

// Functions =============================================================

// Fill table with data
function populateTable() {
    console.log("inside populating table");
    // Empty content string
    var tableContent = '';

    // jQuery AJAX call for JSON
    $.getJSON( '/storjapi/addaccesslog', function( data ) {
            // For each item in our JSON, add a table row and cells to the content string
            $.each(data, function(){
                console.log(this.accessip+this.datetime);
            tableContent += '<tr>';
            tableContent += '<td><a href="#" class="linkshowuser" rel="' + this.accessip + '">' + this.accessip+ '</a></td>';
            tableContent += '<td>' + this.datetime + '</td>';
            tableContent += '</tr>';
        });
            // Inject the whole content string into our existing HTML table
        $('#accessLog table tbody').html(tableContent);
        $body.removeClass("loading"); 

        });
}
