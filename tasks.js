const extras = require('./nools-extras');

// Set this to 1 to display tasks early.
const debug_early = 0;

/**
 * Helper to create a task for a question set that triggers an HW task.
 *
 * @param {string} name: the name of the task
 * @param {string} hwForm: the HWXX form that will be triggered
 * @param {string} daysDue: days until due
 * @param {int} priority: priority fo task
 * @param {function} appliiesIf: the function to determine if this should apply
 * @param {Object} options: other options to include
 */
function buildQsTask(name, hwForm, daysDue, priority, appliesIf, options) {
  var defOpt = {
    icon: options && 'icon' in options ? options.icon : 'icon-follow-up',
    title: options && 'title' in options ? options.title : name,
    taskName: options && 'taskName' in options ? options.taskName : `task.${name}`,
    modifyContent: options && options.modifyContent, // default undefined
  };
  // Need to allow this to be a function, because sometimes the priority is
  // dependent on the status of the patient.
  let priorityFn;
  if (priority instanceof Function) {
    priorityFn = priority;
  } else {
    priorityFn = () => priority;
  }
  return {
    name,
    icon: defOpt.icon,
    title: defOpt.title,
    appliesTo: 'reports',
    appliesToType: extras.sms_reports,
    appliesIf,
    resolvedIf: function (contact, report) {
      var hwReport = extras.getMostRecentReport(contact.reports, [hwForm]);
      return hwReport && hwReport.reported_date > report.reported_date;
    },
    actions: [
      {
        type: 'report',
        form: hwForm,
        label: defOpt.taskName,
        modifyContent: defOpt.modifyContent,
      },
    ],
    events: [
      {
        id: defOpt.taskName,
        dueDate: function(e, c, report) {
          const t = extras.addDays(report.reported_date, daysDue);
          t.setSeconds(priorityFn(c)); // For sorting purposes, this is the priority.
          return t;
        },
        start: 0,
        end: 14,
      },
    ],
  };
}

function buildResolvedIfLaterReportExists(formName) {
  return (contact, report) => {
    const latestReport =
      extras.getMostRecentReport(contact.reports, formName);
    return latestReport && latestReport.reported_date > report.reported_date;
  };
}

module.exports = [
  /****
   Use case :  COVID-19 screening
   1. Followup after positive COVID-19 testing
   ****/

  // 1. Positive COVID-19 follow-up
  {
    name: 'covid-followup',
    icon: 'icon-healthcare',
    title: 'task.covid_followup.title',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (c) {

      this.mostRecentCasestatus = Utils.getMostRecentReport(c.reports, 'form_a0');
      return this.mostRecentCasestatus && Utils.getField(this.mostRecentCasestatus, 'case_status_.case_status') === 'confirmed';
    },
    resolvedIf: function (c, r, event) {
      const startTime = Utils.addDate(event.dueDate(c, r), -event.start);
      const endTime = Utils.addDate(event.dueDate(c, r), event.end + 1);

      const reportsAfterRdt = c.reports.filter(report => report.reported_date >= this.mostRecentCasestatus.reported_date);
      return Utils.isFormSubmittedInWindow(reportsAfterRdt, 'covid_rdt_followup', startTime, endTime);
    },
    events: [{
      start: 1,
      end: 3,
      dueDate: function() {
        return Utils.addDate(new Date(this.mostRecentCasestatus.reported_date), 1);
      },
    }],
    actions: [{
      type: 'contacts',
      form: 'hbc_followup',
      label: 'task.covid_followup.title',
    }],
  },
