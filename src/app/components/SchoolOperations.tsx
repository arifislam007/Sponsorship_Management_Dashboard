import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import ClassRoutine from './school-ops/ClassRoutine';
import CurriculumActivities from './school-ops/CurriculumActivities';
import TeacherAttendance from './school-ops/TeacherAttendance';
import ExamScheduler from './school-ops/ExamScheduler';

export default function SchoolOperations() {
  const [activeTab, setActiveTab] = useState('routines');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">School Operations</h1>
          <p className="text-gray-600 mt-2">Manage class routines, curriculum, attendance, and exam schedules</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="routines" className="flex items-center gap-2">
              📚 Class Routines
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-2">
              📖 Curriculum
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              ✓ Attendance
            </TabsTrigger>
            <TabsTrigger value="exams" className="flex items-center gap-2">
              📝 Exams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routines" className="space-y-4">
            <ClassRoutine />
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-4">
            <CurriculumActivities />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <TeacherAttendance />
          </TabsContent>

          <TabsContent value="exams" className="space-y-4">
            <ExamScheduler />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
