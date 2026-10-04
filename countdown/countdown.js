const deadline =
  new Date(
    "2026-10-05T23:59:00+03:00"
  ).getTime();



const hoursElement =
  document.getElementById(
    "hours"
  );


const minutesElement =
  document.getElementById(
    "minutes"
  );


const secondsElement =
  document.getElementById(
    "seconds"
  );


const statusElement =
  document.getElementById(
    "status"
  );


const registrationButton =
  document.getElementById(
    "registrationButton"
  );



let timerInterval;



function formatNumber(number) {

  return String(number)
    .padStart(
      2,
      "0"
    );

}



function closeRegistration() {


  hoursElement.textContent =
    "00";


  minutesElement.textContent =
    "00";


  secondsElement.textContent =
    "00";


  statusElement.textContent =
    "ACCESS CLOSED";


  registrationButton.classList
    .add(
      "closed"
    );


  registrationButton
    .removeAttribute(
      "href"
    );


  const buttonText =
    registrationButton
      .querySelector(
        ".button-text"
      );


  buttonText.textContent =
    "РЕГИСТРАЦИЯ ЗАКРЫТА";


  const arrow =
    registrationButton
      .querySelector(
        ".arrow"
      );


  arrow.style.display =
    "none";


  document.title =
    "AURA // ACCESS CLOSED";

}



function updateCountdown() {


  const now =
    Date.now();


  const distance =
    deadline - now;



  if (
    distance <= 0
  ) {


    closeRegistration();


    if (
      timerInterval
    ) {

      clearInterval(
        timerInterval
      );

    }


    return;

  }



  const totalSeconds =
    Math.floor(
      distance / 1000
    );



  const hours =
    Math.floor(
      totalSeconds / 3600
    );



  const minutes =
    Math.floor(

      (
        totalSeconds %
        3600
      ) / 60

    );



  const seconds =
    totalSeconds % 60;



  hoursElement.textContent =
    formatNumber(
      hours
    );


  minutesElement.textContent =
    formatNumber(
      minutes
    );


  secondsElement.textContent =
    formatNumber(
      seconds
    );



  /*
    STATUS
  */


  if (

    distance <=
    10 * 60 * 1000

  ) {


    statusElement.textContent =
      "CRITICAL";


  }


  else if (

    distance <=
    60 * 60 * 1000

  ) {


    statusElement.textContent =
      "WARNING";


  }


  else {


    statusElement.textContent =
      "ACTIVE";


  }

}



updateCountdown();



timerInterval =
  setInterval(

    updateCountdown,

    1000

  );
