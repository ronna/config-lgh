const thisContact = contact;
const thisLineage = lineage;
const allReports = reports;


const getField = (report, fieldPath) => [...(fieldPath || '').split('.')]
    .reduce((prev, fieldName) => {
      if (prev === undefined) { return undefined; }
      return prev[fieldName];
    }, report);

const isCovidPatient = () => { return getField(thisContact, 'role') === 'covid_patient'; };

const isReportValid = function (report) {
  if (report.form && report.fields && report.reported_date) { return true; }
  return false;
};

const hasReport = function (form) {
  return allReports && allReports.some((report) => report.form === form);
};

const context = {
  isPatient: isCovidPatient(),
  hasOutcomeForm: hasReport('outcome_report'),
  hasQuarantineForm: hasReport('form_a0'),
};

const fields = [
  { appliesToType: 'person', label: 'patient_id', value: thisContact.patient_id, width: 4 },
  { appliesToType: 'person', label: 'contact.age', value: thisContact.date_of_birth, width: 4, filter: 'age' },
  { appliesToType: 'person', label: 'contact.sex', value: 'contact.sex.' + thisContact.sex, translate: true, width: 4 },
  { appliesToType: 'person', label: 'person.field.phone', value: thisContact.phone, width: 4 },
  { appliesToType: 'person', label: 'person.field.alternate_phone', value: thisContact.phone_alternate, width: 4 },
  //{ appliesToType: 'person', appliesIf: isTraveler, label: 'contact.nationality', value: 'country.' + getField(thisContact, 'traveler.nationality'), translate: true, width: 4 },
  //{ appliesToType: 'person', appliesIf: isTraveler, label: 'contact.passport', value: getField(thisContact, 'traveler.passport'), width: 4 },
  { appliesToType: 'person', label: 'contact.parent', value: thisLineage, filter: 'lineage' },
  { appliesToType: '!person', label: 'contact', value: thisContact.contact && thisContact.contact.name, width: 4 },
  { appliesToType: '!person', label: 'contact.phone', value: thisContact.contact && thisContact.contact.phone, width: 4 },
  { appliesToType: '!person', label: 'External ID', value: thisContact.external_id, width: 4 },
  { appliesToType: '!person', appliesIf: function () { return thisContact.parent && thisLineage[0]; }, label: 'contact.parent', value: thisLineage, filter: 'lineage' },
  { appliesToType: 'person', label: 'contact.notes', value: thisContact.notes, width: 12 },
  { appliesToType: '!person', label: 'contact.notes', value: thisContact.notes, width: 12 }
];

const cards = [
  {
    label: 'contact.profile.form_a0',
    appliesToType: 'person',
    appliesIf: function () {
      return isPatient() && !!getNewestReport(allReports, 'form_a0');
    },
    fields: function () {
      const fields = [];
      const report = getNewestReport(allReports, 'form_a0');
      //const temp_infra_unit = getField(report, 'fields.temp_infra_unit');
      const days_symptoms_onset = getField(report, 'fields.days_since_symptoms_onset');
      //const temp_infra_unit_text = temp_infra_unit === 'celsius' ? '°C' : temp_infra_unit === 'fahrenheit' ? '°F' : '';
      //const temp_clinical_unit_text = temp_clinical_unit === 'celsius' ? '°C' : temp_clinical_unit === 'fahrenheit' ? '°F' : '';
      if (report) {
        fields.push(
            //{ label: 'contact.profile.referral.temp_ir', value: getField(report, 'fields.temp_infra') + temp_infra_unit_text, width: 6 },
            //{ label: 'contact.profile.referral.temp_clinical', value: getField(report, 'fields.temp_clinical') + temp_clinical_unit_text, width: 6 },
            { label: 'contact.profile.days_symptoms_onset', value:  getField(report, 'fields.days_since_symptoms_onse'), translate: true, width: 6 },
            { label: '', icon: 'icon-risk', width: 6 }
        );
      }

      return fields;
    }
  },

  {
    label: 'contact.profile.outcome_report',
    appliesToType: 'person',
    appliesIf: isPatient,
    fields: function () {
      const fields = [];
      const report = getNewestReport(allReports, 'outcome_report');
      if (report) {
        fields.push(
            { label: 'contact.profile.outcome.date', value: getField(report, 'fields.date_of_outcome_submission'), filter: 'simpleDate', width: 4 },
            { label: 'contact.profile.outcome.health_outcome', value: getField(report, 'fields.health_outcome'), width: 4 },
            { label: 'contact.profile.outcome.date_outcome', value: getField(report, 'fields.isolation_details.outcome_date_of_outcome'), filter: 'simpleDate', width: 4 },
            { label: 'contact.profile.outcome.outcome_lab_result', value: getField(report, 'fields.outcome_lab_result'), width: 4 }
          }
        );
      }
      else {
        fields.push({ label: 'contact.profile.outcome_report.none' });
      }

      return fields;
    }
  },

  {
    label: 'contact.profile.declaration.form',
    appliesToType: 'person',
    appliesIf: isPatient,
    fields: function () {
      const fields = [];
      const report = getNewestReport(allReports, 'form_a0');
      if (report) {
        const contactRiskFactors = getRiskFactors(getField(report, 'fields.contact_confirmed_cases'));
        const healthRiskFactors = getRiskFactors(getField(report, 'fields.existing_conditions'));

        if (contactRiskFactors && contactRiskFactors.length > 0) {
          fields.push({ label: 'risk.contact.found', width: 12, icon: 'icon-risk' });
          contactRiskFactors.forEach(function (risk) {
            fields.push({ value: 'risk.contact.' + risk, translate: true, width: 12 });
          });
        }

        else {
          fields.push({ label: 'risk.contact.none' });
        }

        if (healthRiskFactors && healthRiskFactors.length > 0) {
          fields.push({ label: 'risk.health.found', width: 12, icon: 'icon-risk' });
          healthRiskFactors.forEach(function (risk) {
            fields.push({ value: 'risk.health.' + risk, translate: true, width: 12 });
          });
        }

        else {
          fields.push({ label: 'risk.health.none' });
        }

      }
      else {
        fields.push({ label: 'contact.profile.declaration.form.none' });
      }

      return fields;
    }
  },

  /**{
    label: 'contact.profile.locator.form',
    appliesToType: 'person',
    appliesIf: isTraveler,
    fields: function () {
      const fields = [];
      const report = getNewestReport(allReports, 'locator');
      if (report) {
        fields.push(
            { label: 'contact.profile.locator.airline', value: getField(report, 'fields.flight_info.airline'), width: 4 },
            { label: 'contact.profile.locator.flight', value: getField(report, 'fields.flight_info.flight'), width: 4 },
            { label: 'contact.profile.locator.arrival_date', value: getField(report, 'fields.flight_info.arrival_date_updated') || getField(report, 'fields.flight_info.arrival_date'), filter: 'simpleDate', width: 4 }

        );
      }
      else {
        fields.push({ label: 'contact.profile.locator.form.none' });
      }

      return fields;
    }
  } */

];

function getRiskFactors(group) {
  if (!group) return false;
  const riskFactors = [];
  Object.keys(group).forEach(function (key) {
    if (group[key] === 'true' && key.indexOf('_risk') < 0) {
      riskFactors.push(key);
    }
  });
  return riskFactors;
}

function getNewestReport(allReports, forms) {
  let result;
  allReports && allReports.forEach(function (report) {
    if (!isReportValid(report) || !forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
}


module.exports = {
  context: context,
  cards: cards,
  fields: fields
};
