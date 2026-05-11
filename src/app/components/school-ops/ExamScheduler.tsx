import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Plus, Calendar, Trash2, BookOpen } from 'lucide-react';

interface ExamSchedule {
  id: number;
  exam_name: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  class_name: string;
  room_number?: string;
  invigilator_name?: string;
  total_marks: number;
}

interface Exam {
  id: number;
  exam_name: string;
  exam_type: string;
}

interface Class {
  id: number;
  class_name: string;
}

const API_BASE = '/api/school-operations';

export default function ExamScheduler() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    exam_id: '',
    subject: '',
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:30',
    duration_minutes: 90,
    total_marks: 100,
    room_number: '',
  });

  // Fetch exams and classes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, classesRes] = await Promise.all([
          fetch(`${API_BASE}/exams`),
          fetch(`${API_BASE}/classes`)
        ]);
        
        if (!examsRes.ok || !classesRes.ok) throw new Error('Failed to fetch data');
        
        const examsData = await examsRes.json();
        const classesData = await classesRes.json();
        
        setExams(examsData);
        setClasses(classesData);
        if (classesData.length > 0) {
          setSelectedClass(classesData[0].id.toString());
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  // Fetch schedules for selected class
  useEffect(() => {
    if (selectedClass) {
      fetchSchedules();
    }
  }, [selectedClass]);

  const fetchSchedules = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/schedules/class/${selectedClass}`);
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data = await res.json();
      setSchedules(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.exam_id || !newSchedule.subject || !selectedClass) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(selectedClass),
          ...newSchedule,
          exam_id: parseInt(newSchedule.exam_id),
          duration_minutes: parseInt(newSchedule.duration_minutes),
          total_marks: parseInt(newSchedule.total_marks),
        }),
      });

      if (!res.ok) throw new Error('Failed to add schedule');
      await fetchSchedules();
      setIsAddingSchedule(false);
      setNewSchedule({
        exam_id: '',
        subject: '',
        exam_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:30',
        duration_minutes: 90,
        total_marks: 100,
        room_number: '',
      });
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(`${API_BASE}/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete schedule');
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group schedules by exam date
  const schedulesByDate = schedules.reduce((acc: any, schedule) => {
    const date = schedule.exam_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(schedule);
    return acc;
  }, {});

  const sortedDates = Object.keys(schedulesByDate).sort();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Exam Schedule Planner
          </CardTitle>
          <CardDescription>Schedule exams for classes and track exam details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="class-select">Select Class</Label>
              <select
                id="class-select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                ))}
              </select>
            </div>
            <div></div>
            <div className="flex items-end">
              <Button
                onClick={() => setIsAddingSchedule(!isAddingSchedule)}
                className="w-full"
                variant={isAddingSchedule ? 'outline' : 'default'}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAddingSchedule ? 'Cancel' : 'Add Exam'}
              </Button>
            </div>
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {isAddingSchedule && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="exam">Select Exam *</Label>
                    <select
                      id="exam"
                      value={newSchedule.exam_id}
                      onChange={(e) => setNewSchedule({...newSchedule, exam_id: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Choose an exam...</option>
                      {exams.map(exam => (
                        <option key={exam.id} value={exam.id}>{exam.exam_name} ({exam.exam_type})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Mathematics"
                      value={newSchedule.subject}
                      onChange={(e) => setNewSchedule({...newSchedule, subject: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="exam-date">Exam Date *</Label>
                    <Input
                      id="exam-date"
                      type="date"
                      value={newSchedule.exam_date}
                      onChange={(e) => setNewSchedule({...newSchedule, exam_date: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total-marks">Total Marks</Label>
                    <Input
                      id="total-marks"
                      type="number"
                      value={newSchedule.total_marks}
                      onChange={(e) => setNewSchedule({...newSchedule, total_marks: parseInt(e.target.value)})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({...newSchedule, start_time: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time *</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({...newSchedule, end_time: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newSchedule.duration_minutes}
                      onChange={(e) => setNewSchedule({...newSchedule, duration_minutes: parseInt(e.target.value)})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="room">Room Number</Label>
                    <Input
                      id="room"
                      placeholder="e.g., 101"
                      value={newSchedule.room_number}
                      onChange={(e) => setNewSchedule({...newSchedule, room_number: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleAddSchedule} className="w-full">Create Exam Schedule</Button>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-center py-4 text-gray-500">Loading schedules...</p>
          ) : sortedDates.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No exam schedules created yet</p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date}>
                  <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="space-y-2 ml-4">
                    {schedulesByDate[date].map(schedule => (
                      <div key={schedule.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{schedule.exam_name} - {schedule.subject}</div>
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <div>🕐 {schedule.start_time} - {schedule.end_time} ({schedule.duration_minutes} min)</div>
                              <div>📍 Room {schedule.room_number || 'TBA'}</div>
                              <div>✏️ Total Marks: {schedule.total_marks}</div>
                              {schedule.invigilator_name && <div>👤 Invigilator: {schedule.invigilator_name}</div>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
