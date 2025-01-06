'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet, FileIcon as FilePdf } from 'lucide-react'
import * as XLSX from 'xlsx'
import saveAs from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface StudentResult {
  status: 'FOUND' | 'NOT_FOUND';
  message?: string;
  personalDetails?: {
    hallTicketNo: string;
    name: string;
    fatherName: string;
    gender: string;
    course: string;
  };
  marks?: Array<{
    subCode: string;
    subjectName: string;
    credits: string;
    gradePoints: string;
    gradeSecurity: string;
  }>;
  result?: {
    semester: string;
    sgpa: string;
    cgpa: string;
  };
}

export default function StudentResults() {
  const [startRollNo, setStartRollNo] = useState('')
  const [endRollNo, setEndRollNo] = useState('')
  const [url, setUrl] = useState('')
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateRollNo = (rollNo: string) => {
    return /^\d{12}$/.test(rollNo)
  }

  const fetchResults = async () => {
    if (!validateRollNo(startRollNo) || !validateRollNo(endRollNo)) {
      setError("Please enter valid 12-digit roll numbers.");
      return;
    }

    if (!url) {
      setError("Please enter the URL for fetching results.");
      return;
    }

    setLoading(true);
    setResults([]);
    setError(null);

    const start = parseInt(startRollNo);
    const end = parseInt(endRollNo);

    for (let rollNo = start; rollNo <= end; rollNo++) {
      try {
        const response = await fetch('/api/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, htno: rollNo.toString().padStart(12, '0') }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResults(prev => [...prev, data.data]);
      } catch (error) {
        console.error('Error fetching results:', error);
        setError(`Failed to fetch results for roll number ${rollNo}. Please try again.`);
        break;
      }
    }

    setLoading(false);
  }

  const getSgpaColor = (sgpa: string) => {
    if (sgpa.includes('PASSED')) {
      const sgpaValue = parseFloat(sgpa.split('-')[1])
      if (sgpaValue >= 9) return 'text-green-600'
      if (sgpaValue >= 8) return 'text-blue-600'
      if (sgpaValue >= 7) return 'text-yellow-600'
      return 'text-orange-600'
    }
    return 'text-red-600'
  }

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(results.map(result => ({
      'Hall Ticket No': result.personalDetails?.hallTicketNo,
      'Name': result.personalDetails?.name,
      'Father\'s Name': result.personalDetails?.fatherName,
      'Gender': result.personalDetails?.gender,
      'Course': result.personalDetails?.course,
      'SGPA': result.result?.sgpa,
      'CGPA': result.result?.cgpa
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(data, "student_results.xlsx");
  }

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Student Results", 14, 15);

    const tableColumn = ["Hall Ticket No", "Name", "SGPA", "CGPA"];
    const tableRows = results.map(result => [
      result.personalDetails?.hallTicketNo,
      result.personalDetails?.name,
      result.result?.sgpa,
      result.result?.cgpa
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20
    });

    doc.save("student_results.pdf");
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">OU Results Extractor</h1>
        <p className="text-xl text-muted-foreground">Easily fetch and analyze student results from Osmania University</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Details</CardTitle>
          <CardDescription>Provide the range of roll numbers and the results URL</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startRollNo">Starting Roll No.</Label>
              <Input
                id="startRollNo"
                placeholder="e.g., 245521733150"
                value={startRollNo}
                onChange={(e) => setStartRollNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endRollNo">Ending Roll No.</Label>
              <Input
                id="endRollNo"
                placeholder="e.g., 245521733155"
                value={endRollNo}
                onChange={(e) => setEndRollNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Results URL</Label>
              <Input
                id="url"
                placeholder="Enter the OU results URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={fetchResults} 
            disabled={loading} 
            className="mt-4 w-full"
          >
            {loading ? 'Fetching Results...' : 'Fetch Results'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Results</span>
              <div className="space-x-2">
                <Button onClick={downloadExcel} variant="outline" size="sm">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={downloadPDF} variant="outline" size="sm">
                  <FilePdf className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hall Ticket No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SGPA</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.personalDetails?.hallTicketNo || `row-${Math.random()}`}>
                    <TableCell>{result.personalDetails?.hallTicketNo}</TableCell>
                    <TableCell>{result.personalDetails?.name}</TableCell>
                    <TableCell className={getSgpaColor(result.result?.sgpa || '')}>
                      {result.result?.sgpa}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">More Info</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{result.personalDetails?.name} - Details</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4 space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Personal Details</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p><strong>Hall Ticket No:</strong> {result.personalDetails?.hallTicketNo}</p>
                                <p><strong>Father's Name:</strong> {result.personalDetails?.fatherName}</p>
                                <p><strong>Gender:</strong> {result.personalDetails?.gender}</p>
                                <p><strong>Course:</strong> {result.personalDetails?.course}</p>
                              </CardContent>
                            </Card>
                            {result.marks && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>Marks</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Subject Code</TableHead>
                                        <TableHead>Subject Name</TableHead>
                                        <TableHead>Credits</TableHead>
                                        <TableHead>Grade Points</TableHead>
                                        <TableHead>Grade</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {result.marks.map((mark, index) => (
                                        <TableRow key={`${result.personalDetails?.hallTicketNo}-mark-${index}`}>
                                          <TableCell>{mark.subCode}</TableCell>
                                          <TableCell>{mark.subjectName}</TableCell>
                                          <TableCell>{mark.credits}</TableCell>
                                          <TableCell>{mark.gradePoints}</TableCell>
                                          <TableCell>{mark.gradeSecurity}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </CardContent>
                              </Card>
                            )}
                            {result.result && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>Result</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p><strong>Semester:</strong> {result.result.semester}</p>
                                  <p><strong>SGPA:</strong> {result.result.sgpa}</p>
                                  <p><strong>CGPA:</strong> {result.result.cgpa}</p>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

