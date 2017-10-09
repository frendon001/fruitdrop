    $.ajaxSetup({ cache: true });
    $.getScript('//connect.facebook.net/en_US/sdk.js', function(){
        FB.init({
            appId: '303697393443959',
            version: 'v2.7' // or v2.1, v2.2, v2.3, ...
        });     
        $('#loginbutton,#feedbutton').removeAttr('disabled');
        FB.getLoginStatus(updateStatusCallback);
    });

$(document).ready(function() {

    function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    };
    var uid = getUrlParameter('uid');
    var currentUser;

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            if (uid === user.uid) {
                currentUser = firebase.auth().currentUser;
                displaySelfInfo();
            } else {
                displayInfo();
                $("#button1").html("<a class='nav-link' id='profile-link' href='#'>Profile</a>");
                $(document).on("click", "#profile-link", function() {
                    window.location = "profile.html?uid=" + user.uid;
                });
            }
        } else {
            displayInfo();
        }
    });
    // display user's own profile
    function displaySelfInfo() {
        $("#button1").html("<a class='nav-link' id='logout' href='#'>Logout</a>");
        $(document).on("click", "#logout", function() {
            logout();
        });
        $("#profile-pic").attr("src", currentUser.photoURL);
        $("#profile-name").text(currentUser.displayName);
        $("#email").html(currentUser.email);
        firebase.database().ref("users").child(currentUser.uid).on("child_added", function(childSnapshot) {
            $("#bio").text(childSnapshot.val().bio);
            $("#personal-link").html(childSnapshot.val().personal).attr("href", "http://" + childSnapshot.val().personal);
        });
        // create column to edit and delete listing
        $("#table-headers").append("<th>Edit</th><th>Delete</th>");
        displayListings();
    }
    // Display user's listings in profile
    function displayListings() {
        $("#listings").empty();
        firebase.database().ref("listings").on("child_added", function(childSnapshot) {
            // check children apply to current user
            if (childSnapshot.child('uid').val() === currentUser.uid) {
                // add to profile
                $("#listings").append("<tr><td>" + childSnapshot.val().item +
                    "</td><td>" + childSnapshot.val().quantity +
                    "</td><td>" + childSnapshot.val().street + " " + childSnapshot.val().zipCode +
                    "</td><td>" + childSnapshot.val().date + 
                    "</td><td><button class='edit-listing' data-id='" + childSnapshot.key + "'>Edit</button>" + 
                    "</td><td><button class='delete-listing' data-id='" + childSnapshot.key + "'>Delete</button>" + 
                    "</td></tr>"
                );
            }
        });
    }
    // display another user's profile
    function displayInfo() {
        firebase.database().ref("users").child(uid).once("value").then(function(snapshot) {
            currentUser = {
                uid: uid,
                photoURL: snapshot.val().photoURL,
                displayName: snapshot.val().displayName,
                email: snapshot.val().email
            };
            $("#edit-profile").css("display", "none");
            $("#add").css("display", "none");
            $("#profile-pic").attr("src", currentUser.photoURL);
            $("#profile-name").text(currentUser.displayName);
            $("#email").html("<a href='mailto:" + currentUser.email + "'>" + currentUser.email + "</a>");
            firebase.database().ref("users").child(currentUser.uid).on("child_added", function(childSnapshot) {
                $("#bio").text(childSnapshot.val().bio);
                $("#personal-link").html(childSnapshot.val().personal).attr("href", "http://" + childSnapshot.val().personal);
            });
            // Display user's listings in profile
            firebase.database().ref("listings").once("value").then(function(snapshot) {
                snapshot.forEach(function(childSnapshot) {
                    // check children apply to current user
                    if (childSnapshot.child('uid').val() === currentUser.uid) {
                        //add to profile
                        $("#listings").append("<tr><td>" + childSnapshot.val().item +
                            "</td><td>" + childSnapshot.val().quantity +
                            "</td><td>" + childSnapshot.val().street + " " + childSnapshot.val().zipCode +
                            "</td><td>" + childSnapshot.val().date + "</td></tr>"
                        );
                    }
                });
            });
        });
    }


    function logout() {
        firebase.auth().signOut().then(function() {
            window.location = "index.html";
        }).catch(function(error) {
            console.log(error);
        });
    }

    $("#logout").on("click", function() {
        logout();
    });

    // Display form to add listing
    $("#add").on("click", function() {
        $('#addListing').modal('show');
        $('#submit-edit').attr("id", "submit-add");
    });

    

    // Submit form to add listing
    $(document).on("click", "#submit-add", function(event) {

        event.preventDefault();

        // Get the input values
        var item = $("#item").val();
        var quantity = $("#quantity").val();
        var street = $("#street").val();
        var zipCode = $("#zip-code").val();
        var date = $("#date").val();
        // Input to firebase
        var newListing = firebase.database().ref("listings").push({
            item: item,
            quantity: quantity,
            street: street,
            zipCode: zipCode,
            date: date,
            uid: currentUser.uid,

        });

        var geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({'address': street + zipCode}, function(results, status) {
            if (status !== google.maps.GeocoderStatus.OK) {
                console.log("Geocode was not successful for the following reason: " + status);
            } else {
                var latitude = results[0].geometry.location.lat();
                var longitude = results[0].geometry.location.lng();

                firebase.database().ref("listings").child(newListing.key).update({
                    lat: latitude,
                    long: longitude
                })
            }
        });

        //add new listing to items list on firebase
        firebase.database().ref("items").child(item).push(newListing.key);
        
        $('#addListing').modal('hide');

        displayListings();
    });

    var listingId;
    // Display form to edit listing
    $(document).on("click", ".edit-listing", function() {
        listingId = $(this).attr("data-id");
        // grab existing values from firebase
        firebase.database().ref("listings").child(listingId).once("value").then(function(snapshot) {
            $("#item").val(snapshot.val().item);
            $("#quantity").val(snapshot.val().quantity);
            $("#street").val(snapshot.val().street);
            $("#zip-code").val(snapshot.val().zipCode);
            $("#date").val(snapshot.val().date);
        });
        $('#addListing').modal('show');
        $('#submit-add').attr("id", "submit-edit");
    });

    // Submit form to edit listing
    $(document).on("click", "#submit-edit", function(event) {
        event.preventDefault();

        // Get the input values
        var item = $("#item").val();
        var quantity = $("#quantity").val();
        var street = $("#street").val();
        var zipCode = $("#zip-code").val();
        var date = $("#date").val();
        // update listing in firebase
        firebase.database().ref("listings").child(listingId).update({
            item: item,
            quantity: quantity,
            street: street,
            zipCode: zipCode,
            date: date,
        });
        $('#addListing').modal('hide');
        
        displayListings();
    });

    // clear form 
    $('#addListing').on('hidden.bs.modal', function () {
        $("#item").val("");
        $("#quantity").val("");
        $("#street").val("");
        $("#zip-code").val("");
        $("#date").val("");
    });

    // delete listing
    $(document).on("click", ".delete-listing", function() {
        listingId = $(this).attr("data-id");
        // grab existing values from firebase
        firebase.database().ref("listings").child(listingId).remove();
        
        displayListings();
    });

    // Display form to edit profile
    $("#edit-profile").on("click", function() {
        $("#profile-new").modal("show");
    });
    // Submit form to update profile
    $(document).on("click", "#submit-profile", function(event) {
        event.preventDefault();

        var bio = $("#user-bio").val().trim();
        var personalSite = $("#personal").val().trim();

        firebase.database().ref("bio").child(currentUser.uid).update({
            bio: bio,
            personal: personalSite
        })
        $("#profile-new").modal("hide");
    });
     // Facebook Share button
    $(document).on("click", "#fb-share", function() {
     FB.ui({
         method: 'share',
         href: 'https://gracepark.github.io/fruitdrop/public/profile.html?uid=' + currentUser.uid,
     }, function(response) {});
 });
   
});