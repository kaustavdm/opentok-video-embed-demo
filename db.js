// This is our simple DB in memory. A real-world use case would use an actual database.
let DB = {

  // Used to store meeting information
  meetings: [],

  // Used to store embed code
  embed_code: ""
};

let sort = m_list => {
  return m_list.sort(function (a, b) {
    return a.start_time > b.start_time;
  });
}

/**
 * Filters through given list of meetings and split it into upcoming and current meetings based on time.
 *
 * @param {null|boolean} is_booked - If `null` or `undefined`, filter on all items in `mlist`. If true, filter only on
 * meetings that are booked. If false, filter only on meetings that have not been booked.
 * @return {object} Object containing `upcoming` and `current` meetings
 */
DB.meetings_filter = function (is_booked=null) {
  const currtime = Date.now();
  let mlist;

  if (is_booked != null) {
    if (is_booked) {
      mlist = () => this.meetings.filter(m => m.booked);
    } else {
      mlist = () => this.meetings.filter(m => !m.booked);
    }
  } else {
    mlist = () => this.meetings;
  }

  return {
    // Starting after 5 minutes
    upcoming: sort(mlist().filter(i => i.start_time.getTime() >= currtime + 300000 )),
    // Starting in 5 minutes or has already started but not ended
    current: sort(mlist().filter(i => i.start_time.getTime() < currtime + 300000 && i.end_time.getTime() >= currtime))
  }
};

/**
 * Find a meeting by its id
 *
 * @param {number} id - Meeting id
 * @return {null|object} - Null if meeting id is not found, else return the meeting object
 */
DB.meetings_get = function (id) {
  return this.meetings.find(m => m.id === id) || null;
}

/**
 * Add/Update a meeting entry
 *
 * @param {object} new_meeting - Meeting object to replace. If `new_meeting.id` exists, existing entry is updated. Else,
 * a new entry is pushed to `DB.meetings`
 * @return {null|object} - Null if meeting id is not found, else return the meeting object
 */
DB.meetings_put = function (new_meeting) {
  const key = this.meetings.findIndex(m => m.id === new_meeting.id);
  if (key < 0) {
    this.meetings.push(new_meeting);
  } else {
    this.meetings[key] = new_meeting;
  }
}

module.exports = DB;
