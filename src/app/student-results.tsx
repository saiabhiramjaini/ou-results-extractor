"use client"

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

  const normalizeUrl = (inputUrl: string) => {
    const baseUrl = inputUrl.includes('www.') 
      ? inputUrl 
      : inputUrl.replace('https://', 'https://www.');
    return baseUrl;
  }

  const fetchResultWithFallback = async (htno: string, inputUrl: string) => {
    try {
      const urls = [
        inputUrl,
        inputUrl.includes('www.') ? inputUrl.replace('www.', '') : inputUrl.replace('https://', 'https://www.')
      ];

      for (const url of urls) {
        try {
          const response = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, htno })
          });

          if (response.ok) {
            return await response.json();
          }
        } catch (error) {
          continue;
        }
      }
      throw new Error('Failed to fetch results from all URLs');
    } catch (error) {
      throw error;
    }
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
        const data = await fetchResultWithFallback(
          rollNo.toString().padStart(12, '0'),
          normalizeUrl(url)
        );
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
    <div className="container mx-auto p-1 sm:p-2 md:p-4 space-y-2 sm:space-y-4 md:space-y-8">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-primary mb-1 sm:mb-2">OU Results Extractor</h1>
        <p className="text-xs sm:text-sm md:text-xl text-muted-foreground">Easily fetch and analyze student results from Osmania University</p>
      </div>

      <Card className="border-0 sm:border">
        <CardHeader className="space-y-1 sm:space-y-2 p-2 sm:p-4">
          <CardTitle className="text-lg sm:text-xl md:text-2xl">Enter Details</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Provide the range of roll numbers and the results URL</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="startRollNo" className="text-xs sm:text-sm">Starting Roll No.</Label>
              <Input
                id="startRollNo"
                placeholder="e.g., 245521733150"
                value={startRollNo}
                onChange={(e) => setStartRollNo(e.target.value)}
                className="text-xs sm:text-sm md:text-base"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="endRollNo" className="text-xs sm:text-sm">Ending Roll No.</Label>
              <Input
                id="endRollNo"
                placeholder="e.g., 245521733155"
                value={endRollNo}
                onChange={(e) => setEndRollNo(e.target.value)}
                className="text-xs sm:text-sm md:text-base"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="url" className="text-xs sm:text-sm">Results URL</Label>
              <Input
                id="url"
                placeholder="Enter the OU results URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-xs sm:text-sm md:text-base"
              />
            </div>
          </div>
          <Button 
            onClick={fetchResults} 
            disabled={loading} 
            className="mt-2 sm:mt-4 w-full text-xs sm:text-sm"
          >
            {loading ? 'Fetching Results...' : 'Fetch Results'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-0 sm:border-red-200">
          <CardContent className="p-2 sm:p-4">
            <p className="text-red-600 text-xs sm:text-sm md:text-base">{error}</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="border-0 sm:border">
          <CardHeader className="p-2 sm:p-4">
            <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
              <span className="text-lg sm:text-xl">Results</span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={downloadExcel} variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  <FileSpreadsheet className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Excel
                </Button>
                <Button onClick={downloadPDF} variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  <FilePdf className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  PDF
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap text-xs sm:text-sm">Hall Ticket No.</TableHead>
                  <TableHead className="whitespace-nowrap text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="whitespace-nowrap text-xs sm:text-sm">SGPA</TableHead>
                  <TableHead className="whitespace-nowrap text-xs sm:text-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.personalDetails?.hallTicketNo || `row-${Math.random()}`}>
                    <TableCell className="text-xs sm:text-sm">{result.personalDetails?.hallTicketNo}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{result.personalDetails?.name}</TableCell>
                    <TableCell className={`text-xs sm:text-sm ${getSgpaColor(result.result?.sgpa || '')}`}>
                      {result.result?.sgpa}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs sm:text-sm">More Info</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] max-h-[90vh] overflow-y-auto p-2 sm:p-4">
                          <DialogHeader>
                            <DialogTitle className="text-base sm:text-lg md:text-xl">{result.personalDetails?.name} - Details</DialogTitle>
                          </DialogHeader>
                          <div className="mt-2 sm:mt-4 space-y-2 sm:space-y-4">
                            <Card className="border-0 sm:border">
                              <CardHeader className="p-2 sm:p-4">
                                <CardTitle className="text-sm sm:text-base md:text-lg">Personal Details</CardTitle>
                              </CardHeader>
                              <CardContent className="text-xs sm:text-sm md:text-base space-y-1 sm:space-y-2 p-2 sm:p-4">
                                <p><strong>Hall Ticket No:</strong> {result.personalDetails?.hallTicketNo}</p>
                                <p><strong>Father's Name:</strong> {result.personalDetails?.fatherName}</p>
                                <p><strong>Gender:</strong> {result.personalDetails?.gender}</p>
                                <p><strong>Course:</strong> {result.personalDetails?.course}</p>
                              </CardContent>
                            </Card>
                            {result.marks && (
                              <Card className="border-0 sm:border">
                                <CardHeader className="p-2 sm:p-4">
                                  <CardTitle className="text-sm sm:text-base md:text-lg">Marks</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 sm:p-4 overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="whitespace-nowrap text-xs sm:text-sm">Subject Code</TableHead>
                                        <TableHead className="whitespace-nowrap text-xs sm:text-sm">Subject Name</TableHead>
                                        <TableHead className="whitespace-nowrap text-xs sm:text-sm">Credits</TableHead>
                                        <TableHead className="whitespace-nowrap text-xs sm:text-sm">Grade Points</TableHead>
                                        <TableHead className="whitespace-nowrap text-xs sm:text-sm">Grade</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {result.marks.map((mark, index) => (
                                        <TableRow key={`${result.personalDetails?.hallTicketNo}-mark-${index}`}>
                                          <TableCell className="text-xs sm:text-sm">{mark.subCode}</TableCell>
                                          <TableCell className="text-xs sm:text-sm">{mark.subjectName}</TableCell>
                                          <TableCell className="text-xs sm:text-sm">{mark.credits}</TableCell>
                                          <TableCell className="text-xs sm:text-sm">{mark.gradePoints}</TableCell>
                                          <TableCell className="text-xs sm:text-sm">{mark.gradeSecurity}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </CardContent>
                              </Card>
                            )}
                            {result.result && (
                              <Card className="border-0 sm:border">
                                <CardHeader className="p-2 sm:p-4">
                                  <CardTitle className="text-sm sm:text-base md:text-lg">Result</CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs sm:text-sm md:text-base space-y-1 sm:space-y-2 p-2 sm:p-4">
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

