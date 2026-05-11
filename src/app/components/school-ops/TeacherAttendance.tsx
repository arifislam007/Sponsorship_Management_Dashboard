import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Plus, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

interface AttendanceRecord {
  id: number;
  teacher_name: string;
  attendance_date: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  working_hours?: number;
  remarks?: string;
}

interface Teacher {
  id: number;
  full_name: string;
}

const API_BASE = '/api/school-operations';

export default function TeacherAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    teacher_id: '',
    status: 'present',
    check_in_time: '09:00',
    check_out_time: '17:00',
    remarks: '',
  });

  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch(`${API_BASE}/teachers`);
        if (!res.ok) throw new Error('Failed to fetch teachers');
        const data = await res.json();
        setTeachers(data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchTeachers();
  }, []);

  // Fetch attendance records for selected date
  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/date/${selectedDate}`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.teacher_id) {
      setError('Please select a teacher');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: parseInt(newRecord.teacher_id),
          attendance_date: selectedDate,
          status: newRecord.status,
          check_in_time: newRecord.status === 'present' ? newRecord.check_in_time : null,
          check_out_time: newRecord.status === 'present' ? newRecord.check_out_time : null,
          remarks: newRecord.remarks,
        }),
      });

      if (!res.ok) throw new Error('Failed to add attendance record');
      await fetchAttendance();
      setIsAddingRecord(false);
      setNewRecord({
        teacher_id: '',
        status: 'present',
        check_in_time: '09:00',
        check_out_time: '17:00',
        remarks: '',
      });
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(`${API_BASE}/attendance/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete record');
      await fetchAttendance();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'leave':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'late':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'leave': return 'bg-blue-100 text-blue-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-green-600">{presentCount}</div>
            <p className="text-sm text-gray-600">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-red-600">{absentCount}</div>
            <p className="text-sm text-gray-600">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-blue-600">{leaveCount}</div>
            <p className="text-sm text-gray-600">Leave</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-gray-600">{records.length}</div>
            <p className="text-sm text-gray-600">Total Records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Teacher Attendance
          </CardTitle>
          <CardDescription>Mark and track daily teacher attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date-select">Select Date</Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setIsAddingRecord(!isAddingRecord)}
                className="w-full"
                variant={isAddingRecord ? 'outline' : 'default'}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAddingRecord ? 'Cancel' : 'Mark Attendance'}
              </Button>
            </div>
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {isAddingRecord && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="teacher">Select Teacher *</Label>
                    <select
                      id="teacher"
                      value={newRecord.teacher_id}
                      onChange={(e) => setNewRecord({...newRecord, teacher_id: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Choose a teacher...</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={newRecord.status}
                      onChange={(e) => setNewRecord({...newRecord, status: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                      <option value="late">Late</option>
                    </select>
                  </div>
                  {newRecord.status === 'present' && (
                    <>
                      <div>
                        <Label htmlFor="checkin">Check In Time</Label>
                        <Input
                          id="checkin"
                          type="time"
                          value={newRecord.check_in_time}
                          onChange={(e) => setNewRecord({...newRecord, check_in_time: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkout">Check Out Time</Label>
                        <Input
                          id="checkout"
                          type="time"
                          value={newRecord.check_out_time}
                          onChange={(e) => setNewRecord({...newRecord, check_out_time: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Input
                      id="remarks"
                      placeholder="Optional notes"
                      value={newRecord.remarks}
                      onChange={(e) => setNewRecord({...newRecord, remarks: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleAddRecord} className="w-full">Record Attendance</Button>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-center py-4 text-gray-500">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No attendance records for this date</p>
          ) : (
            <div className="space-y-2">
              {records.map(record => (
                <div key={record.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(record.status)}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{record.teacher_name}</div>
                        <div className="text-sm text-gray-600">
                          {record.check_in_time && record.check_out_time && (
                            <>
                              {record.check_in_time} - {record.check_out_time}
                              {record.working_hours && ` (${record.working_hours.toFixed(1)} hrs)`}
                            </>
                          )}
                          {record.remarks && <div>📝 {record.remarks}</div>}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
