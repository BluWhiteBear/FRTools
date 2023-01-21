//Variable declaration
let wValue;
let mValue;
let MET;
let caloriesBurned;
let select = document.getElementById("bikeStyle");

//Arrays
let bikeStyles = ["Bicycling, < 10 mph, leisure", "Bicycling, 10 - 11.9 mph", "Bicycling, 12 - 13.9 mph", "Bicycling, 14 - 15.9 mph", "Bicycling, 16 or higher mph", "Bicycling, mountain, general"];
let possibleMETs = [4, 6.8, 8, 10, 12, 8.5];


//Populates the Bikeing Style input field using an array
for(var i = 0; i < bikeStyles.length; i++)
{
    var option = bikeStyles[i];
    var element = document.createElement("option");

    element.textContent = option;
    element.value = option;
    select.appendChild(element);
}

function calculateRate()
{
    //Retrieves the user's inputs from the values of the input fields
    wValue = document.getElementById("wValue").value;
    mValue = document.getElementById("mValue").value;
    MET = possibleMETs[(document.getElementById("bikeStyle").selectedIndex)];

    if(wValue < 1 || mValue < 1)
    {
        //Alerts the user that their inputs are invalid
        window.alert("1 or more input is empty");
    }
    else
    {
        //Performs calculation to determine calories burned and displays it to the user
        caloriesBurned = (((MET * wValue * 3.5) / 200) * mValue);
        document.getElementById("CaloriesOutput").innerHTML = "Estimated Calories Burned: " + caloriesBurned;

        //Logs the appropriate variable values for debugging purposes
        //console.log(wValue);
        //console.log(mValue);
        //console.log(MET);
        //console.log(caloriesBurned);
    }
}

