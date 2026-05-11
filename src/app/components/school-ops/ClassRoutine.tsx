import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';

interface Routine {
  id: number;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_name?: string;
  room_number?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const API_BASE = '/api/school-operations';

export default function ClassRoutine() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAddingRoutine, setIsAddingRoutine] = useState(false);
  const [newRoutine, setNewRoutine] = useState({
    day_of_week: 'Monday',
    period_number: 1,
    start_time: '09:00',
    end_time: '10:00',
    subject: '',
    room_number: '',
  });

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch(`${API_BASE}/classes`);
        if (!res.ok) throw new Error('Failed to fetch classes');
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].id.toString());
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchClasses();
  }, []);

  // Fetch routines for selected class
  useEffect(() => {
    if (selectedClass) {
      fetchRoutines();
    }
  }, [selectedClass]);

  const fetchRoutines = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/routines/class/${selectedClass}`);
      if (!res.ok) throw new Error('Failed to fetch routines');
      const data = await res.json();
      setRoutines(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoutine = async () => {
    if (!newRoutine.subject || !selectedClass) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(selectedClass),
          ...newRoutine,
        }),
      });

      if (!res.ok) throw new Error('Failed to add routine');
      await fetchRoutines();
      setIsAddingRoutine(false);
      setNewRoutine({
        day_of_week: 'Monday',
        period_number: 1,
        start_time: '09:00',
        end_time: '10:00',
        subject: '',
        room_number: '',
      });
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRoutine = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(`${API_BASE}/routines/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete routine');
      await fetchRoutines();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group routines by day
  const routinesByDay = DAYS.map(day => ({
    day,
    items: routines.filter(r => r.day_of_week === day).sort((a, b) => a.period_number - b.period_number)
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Class Routines
          </CardTitle>
          <CardDescription>Manage weekly class schedule with subject assignments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-end">
              <Button
                onClick={() => setIsAddingRoutine(!isAddingRoutine)}
                className="w-full"
                variant={isAddingRoutine ? 'outline' : 'default'}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAddingRoutine ? 'Cancel' : 'Add Period'}
              </Button>
            </div>
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {isAddingRoutine && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="day">Day</Label>
                    <select
                      id="day"
                      value={newRoutine.day_of_week}
                      onChange={(e) => setNewRoutine({...newRoutine, day_of_week: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="period">Period</Label>
                    <Input
                      id="period"
                      type="number"
                      min="1"
                      max="8"
                      value={newRoutine.period_number}
                      onChange={(e) => setNewRoutine({...newRoutine, period_number: parseInt(e.target.value)})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={newRoutine.start_time}
                      onChange={(e) => setNewRoutine({...newRoutine, start_time: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={newRoutine.end_time}
                      onChange={(e) => setNewRoutine({...newRoutine, end_time: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Mathematics"
                      value={newRoutine.subject}
                      onChange={(e) => setNewRoutine({...newRoutine, subject: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="room">Room Number</Label>
                    <Input
                      id="room"
                      placeholder="e.g., 101"
                      value={newRoutine.room_number}
                      onChange={(e) => setNewRoutine({...newRoutine, room_number: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleAddRoutine} className="w-full">Save Period</Button>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-center py-4 text-gray-500">Loading routines...</p>
          ) : (
            <div className="space-y-4">
              {routinesByDay.map(({ day, items }) => (
                <div key={day}>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{day}</h3>
                  {items.length === 0 ? (
                    <p className="text-gray-500 text-sm ml-4">No classes scheduled</p>
                  ) : (
                    <div className="space-y-2 ml-4">
                      {items.map(routine => (
                        <div key={routine.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Period {routine.period_number}: {routine.subject}</div>
                            <div className="text-sm text-gray-600">
                              {routine.start_time} - {routine.end_time}
                              {routine.room_number && ` • Room ${routine.room_number}`}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteRoutine(routine.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
