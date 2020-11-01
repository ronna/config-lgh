const moment = require('moment');
const today = moment().startOf('day');

const isReportValid = function (report) {
  if (report.form && report.fields && report.reported_date) { return true; }
  return false;
};

const hbcForms = ['form_a0'];

const followupForms = ['hbc_followup', 'general_followup'];

const dischargeForms = ['outcome_report'];

const covidDangerSignForms = ['form_a0', 'hbc_followup', 'general_followup'];


const MAX_DAYS_IN_ISOLATION = 10 + 3;
const MAX_DAYS_IN_ISOLATION2 =  21 + 3;

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

function getFormArraySubmittedInWindow(allReports, formArray, start, end) {
  return allReports.filter(function (report) {
    return formArray.includes(report.form) &&
      report.reported_date >= start && report.reported_date <= end;
  });
}


function getNewestReport(allReports, forms) {
  let result;
  allReports.forEach(function (report) {
    if (!isReportValid(report) || !forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
}


function getDaysSinceSymptomsOnsetFromForm_a0(report) {
  return ishbcForm(report) && getField(report, 'days_since_symptoms_onset') && moment(getField(report, 'days_since_symptoms_onset'));
}

function getDischargeDate(report) {
  return isDischargeForm(report) && getField(report, 'isolation.details.date_of_outcome_submission') && moment(getField(report, 'isolation.details.date_of_outcome_submission'));
}


function isAlive(thisContact) {
  return thisContact && !thisContact.date_of_death;
}

function ishbcForm(report) {
  return report && hbcForms.includes(report.form);
}

function ishbcFollowUpForm(report) {
  return report && followupForms.includes(report.form);
}

function isDischargeForm(report) {
  return report && dischargeForms.includes(report.form);
}

module.exports = {
  today,
  MAX_DAYS_IN_ISOLATION,
  getNewestReport,
  isAlive,
  getDischargeDate,
  getField
};
