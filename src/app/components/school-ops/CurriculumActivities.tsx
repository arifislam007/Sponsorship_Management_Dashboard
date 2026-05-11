import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Plus, Calendar, Trash2, CheckCircle, Clock } from 'lucide-react';

interface Activity {
  id: number;
  activity_name: string;
  subject: string;
  activity_type: string;
  assigned_date: string;
  due_date: string;
  status: string;
  completion_percentage: number;
  teacher_name?: string;
}

const API_BASE = '/api/school-operations';

export default function CurriculumActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_name: '',
    subject: '',
    activity_type: 'assignment',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
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

  // Fetch activities for selected class
  useEffect(() => {
    if (selectedClass) {
      fetchActivities();
    }
  }, [selectedClass]);

  const fetchActivities = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/activities/class/${selectedClass}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      setActivities(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.activity_name || !newActivity.subject || !selectedClass) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(selectedClass),
          ...newActivity,
          status: 'pending',
        }),
      });

      if (!res.ok) throw new Error('Failed to add activity');
      await fetchActivities();
      setIsAddingActivity(false);
      setNewActivity({
        activity_name: '',
        subject: '',
        activity_type: 'assignment',
        assigned_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
      });
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteActivity = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(`${API_BASE}/activities/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete activity');
      await fetchActivities();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredActivities = filterStatus === 'all' 
    ? activities 
    : activities.filter(a => a.status === filterStatus);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Curriculum Activities
          </CardTitle>
          <CardDescription>Track assignments, projects, tests, and curriculum activities</CardDescription>
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
            <div>
              <Label htmlFor="status-filter">Filter by Status</Label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Activities</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setIsAddingActivity(!isAddingActivity)}
                className="w-full"
                variant={isAddingActivity ? 'outline' : 'default'}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAddingActivity ? 'Cancel' : 'Add Activity'}
              </Button>
            </div>
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {isAddingActivity && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="activity-name">Activity Name *</Label>
                    <Input
                      id="activity-name"
                      placeholder="e.g., Chapter 5 Assignment"
                      value={newActivity.activity_name}
                      onChange={(e) => setNewActivity({...newActivity, activity_name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Mathematics"
                      value={newActivity.subject}
                      onChange={(e) => setNewActivity({...newActivity, subject: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      value={newActivity.activity_type}
                      onChange={(e) => setNewActivity({...newActivity, activity_type: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="project">Project</option>
                      <option value="test">Test</option>
                      <option value="practical">Practical</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="assigned-date">Assigned Date</Label>
                    <Input
                      id="assigned-date"
                      type="date"
                      value={newActivity.assigned_date}
                      onChange={(e) => setNewActivity({...newActivity, assigned_date: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="due-date">Due Date *</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={newActivity.due_date}
                      onChange={(e) => setNewActivity({...newActivity, due_date: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleAddActivity} className="w-full">Create Activity</Button>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-center py-4 text-gray-500">Loading activities...</p>
          ) : filteredActivities.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No activities found</p>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map(activity => (
                <div key={activity.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{activity.activity_name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {activity.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>📚 {activity.subject} • {activity.activity_type}</div>
                        <div className="flex items-center gap-4">
                          <span>Due: {new Date(activity.due_date).toLocaleDateString()}</span>
                          {activity.completion_percentage > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-300 rounded-full">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{width: `${activity.completion_percentage}%`}}
                                />
                              </div>
                              <span className="text-xs">{activity.completion_percentage}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
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
