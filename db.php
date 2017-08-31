<?php

use Ramsey\Uuid\Uuid;
use Gregwar\Cache\Cache;

class DB {

  private $db = null;
  private static $instance = null;

  private function __construct () {
    $this->db = new Cache;
    $this->db->setCacheDirectory('../cache');
  }

  private function __clone () {
    // Stopping Clonning of Object
  }

  private function __wakeup () {
    // Stopping unserialize of object
  }

  public function addMeeting ($start_time, $end_time, $booked = false) {
    $meetings = $this->getMeetings();
    if (is_null($meetings)) {
      return NULL;
    }
    $id = Uuid::uuid4()->toString();
    $meetings[$id] = array(
      'id' => $id,
      'start_time' => $start_time,
      'end_time' => $end_time,
      'booked' => $booked
    );
    $this->db->set('meetings', json_encode($meetings));
    return $id;
  }

  public function getMeetings ($id = null, $is_booked = null) {
    $meetings = $this->db->get('meetings');
    if (is_null($meetings)) {
      $this->db->set('meetings', json_encode([]));
      return [];
    }
    $meetings_obj = json_decode($meetings, true);
    if (!is_null($is_booked)) {
      $meetings_obj = array_filter($meetings_obj, function ($v) use ($is_booked) {
        return $v['booked'] == $is_booked;
      });
    }
    $meetings_obj = array_filter($meetings_obj, function ($v) {
      return strtotime($v['end_time']) > strtotime('now');
    });
    if (is_null($id)) {
      return $meetings_obj;
    }
    return $meetings_obj[$id];
  }

  public function bookMeeting ($id) {
    $meetings = $this->getMeetings();
    if (is_null($meeting)) {
      return NULL;
    }
    $meetings[$id]['booked'] = true;
    $this->db->set('meetings', json_encode($meetings));
    return true;
  }

  public function filterMeetings ($is_booked = null) {
    $meetings = $this->getMeetings();
    $now = strtotime('now');
    $upcoming = array_filter($meetings, function ($v) use ($now, $is_booked) {
      $start_time = strtotime($v['start_time']);
      if (is_null($is_booked)) {
        if ($start_time >= $now + 300) {
          return true;
        }
      } else {
        if ($start_time >= $now + 300 && $v['booked'] == $is_booked) {
          return true;
        }
      }
      return false;
    });
    $current = array_filter($meetings, function ($v) use ($now, $is_booked) {
      $start_time = strtotime($v['start_time']);
      $end_time = strtotime($v['end_time']);
      if (is_null($is_booked)) {
        if ($end_time > $now && $start_time < $now + 300) {
          return true;
        }
      } else {
        if ($end_time > $now && $start_time < $now + 300 && $v['booked'] == $is_booked) {
          return true;
        }
      }
      return false;
    });
    return [
      'upcoming' => $upcoming,
      'current' => $current
    ];
  }

  public function setEmbedCode ($code) {
    $this->db->set('embed_code', $code);
  }

  public function getEmbedCode () {
    return $this->db->get('embed_code');
  }

  public static function connect () {
    // Check if instance is already exists
    if(self::$instance == null) {
        self::$instance = new DB();
    }
    return self::$instance;
  }

}
