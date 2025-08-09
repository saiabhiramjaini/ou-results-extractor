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
      return 'text-primary'
    }
    return 'text-destructive'
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12">
        
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full mb-4 md:mb-6 shadow-lg">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 md:mb-4">
            OU Results Extractor
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg lg:text-xl max-w-2xl mx-auto">
            Quickly access multiple Osmania University student results at once with our fast, modern interface—just one click.

          </p>
        </div>

        {/* Input Form Card */}
        <Card className="mb-6 md:mb-8 shadow-lg border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl font-semibold text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Enter Details
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Provide the range of hall ticket numbers and the results URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="startRollNo" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-chart-1 rounded-full"></span>
                  Starting Roll No.
                </Label>
                <Input
                  id="startRollNo"
                  placeholder="e.g., 245521733150"
                  value={startRollNo}
                  onChange={(e) => setStartRollNo(e.target.value)}
                  className="h-12 text-base bg-input border-border focus:border-ring focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endRollNo" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-chart-2 rounded-full"></span>
                  Ending Roll No.
                </Label>
                <Input
                  id="endRollNo"
                  placeholder="e.g., 245521733155"
                  value={endRollNo}
                  onChange={(e) => setEndRollNo(e.target.value)}
                  className="h-12 text-base bg-input border-border focus:border-ring focus:ring-ring"
                />
              </div>
              <div className="space-y-2 lg:col-span-1">
                <Label htmlFor="url" className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  Results URL
                </Label>
                <Input
                  id="url"
                  placeholder="Enter the OU results URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 text-base bg-input border-border focus:border-ring focus:ring-ring"
                />
              </div>
            </div>
            
            <Button 
              onClick={fetchResults} 
              disabled={loading} 
              className="w-full h-12 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching Results...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Fetch Results
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 md:mb-8 border-destructive/30 bg-destructive/10">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-destructive text-sm md:text-base font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <Card className="shadow-lg border-border bg-card">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-semibold text-card-foreground flex items-center gap-2">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Results ({results.length} students)
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">Click "More Info" to view detailed marks for each student</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={downloadExcel} 
                    variant="outline" 
                    className="flex-1 sm:flex-none h-10 border-chart-2/30 text-chart-2 hover:bg-chart-2/10 hover:border-chart-2"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button 
                    onClick={downloadPDF} 
                    variant="outline" 
                    className="flex-1 sm:flex-none h-10 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive"
                  >
                    <FilePdf className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {/* Mobile Cards View */}
              <div className="block md:hidden space-y-4 p-4">
                {results.map((result, index) => (
                  <Card key={result.personalDetails?.hallTicketNo || `row-${index}`} className="border border-border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-card-foreground">{result.personalDetails?.name}</h3>
                            <p className="text-sm text-muted-foreground">{result.personalDetails?.hallTicketNo}</p>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${getSgpaColor(result.result?.sgpa || '')}`}>
                              SGPA: {result.result?.sgpa}
                            </div>
                            <div className={`text-sm font-medium ${getSgpaColor(result.result?.cgpa || '')}`}>
                              CGPA: {result.result?.cgpa}
                            </div>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full border-border hover:bg-muted">
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border">
                            <DialogHeader>
                              <DialogTitle className="text-lg text-card-foreground">{result.personalDetails?.name} - Details</DialogTitle>
                            </DialogHeader>
                            {/* Student Details Modal Content */}
                            <div className="mt-4 space-y-4">
                              <Card className="border-border bg-card">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base text-card-foreground">Personal Details</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2 text-card-foreground">
                                  <p><strong>Hall Ticket No:</strong> {result.personalDetails?.hallTicketNo}</p>
                                  <p><strong>Father's Name:</strong> {result.personalDetails?.fatherName}</p>
                                  <p><strong>Gender:</strong> {result.personalDetails?.gender}</p>
                                  <p><strong>Course:</strong> {result.personalDetails?.course}</p>
                                </CardContent>
                              </Card>
                              
                              {result.marks && (
                                <Card className="border-border bg-card">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-base text-card-foreground">Marks</CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-border">
                                            <TableHead className="text-xs text-muted-foreground py-3 px-4">Subject Code</TableHead>
                                            <TableHead className="text-xs text-muted-foreground py-3 px-4">Subject Name</TableHead>
                                            <TableHead className="text-xs text-muted-foreground py-3 px-4">Credits</TableHead>
                                            <TableHead className="text-xs text-muted-foreground py-3 px-4">Grade Points</TableHead>
                                            <TableHead className="text-xs text-muted-foreground py-3 px-4">Grade</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {result.marks.map((mark, markIndex) => (
                                            <TableRow key={`${result.personalDetails?.hallTicketNo}-mark-${markIndex}`} className="border-border h-12">
                                              <TableCell className="text-xs text-card-foreground py-3 px-4">{mark.subCode}</TableCell>
                                              <TableCell className="text-xs text-card-foreground py-3 px-4">{mark.subjectName}</TableCell>
                                              <TableCell className="text-xs text-card-foreground py-3 px-4">{mark.credits}</TableCell>
                                              <TableCell className="text-xs text-card-foreground py-3 px-4">{mark.gradePoints}</TableCell>
                                              <TableCell className="text-xs text-card-foreground py-3 px-4">{mark.gradeSecurity}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                              
                              {result.result && (
                                <Card className="border-border bg-card">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-base text-card-foreground">Result</CardTitle>
                                  </CardHeader>
                                  <CardContent className="text-sm space-y-2 text-card-foreground">
                                    <p><strong>Semester:</strong> {result.result.semester}</p>
                                    <p><strong>SGPA:</strong> {result.result.sgpa}</p>
                                    <p><strong>CGPA:</strong> {result.result.cgpa}</p>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="font-semibold text-muted-foreground py-4 px-6">Hall Ticket No.</TableHead>
                      <TableHead className="font-semibold text-muted-foreground py-4 px-6">Name</TableHead>
                      <TableHead className="font-semibold text-muted-foreground py-4 px-6">SGPA</TableHead>
                      <TableHead className="font-semibold text-muted-foreground py-4 px-6">CGPA</TableHead>
                      <TableHead className="font-semibold text-muted-foreground py-4 px-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={result.personalDetails?.hallTicketNo || `row-${index}`} className="hover:bg-muted/50 border-border h-16">
                        <TableCell className="font-medium text-card-foreground py-4 px-6">{result.personalDetails?.hallTicketNo}</TableCell>
                        <TableCell className="font-medium text-card-foreground py-4 px-6">{result.personalDetails?.name}</TableCell>
                        <TableCell className={`font-medium py-4 px-6 ${getSgpaColor(result.result?.sgpa || '')}`}>
                          {result.result?.sgpa}
                        </TableCell>
                        <TableCell className={`font-medium py-4 px-6 ${getSgpaColor(result.result?.cgpa || '')}`}>
                          {result.result?.cgpa}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="hover:bg-primary/10 hover:border-primary border-border">
                                More Info
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto bg-card border-border">
                              <DialogHeader>
                                <DialogTitle className="text-xl text-card-foreground">{result.personalDetails?.name} - Details</DialogTitle>
                              </DialogHeader>
                              {/* Same modal content as mobile */}
                              <div className="mt-4 space-y-4">
                                <Card className="border-border bg-card">
                                  <CardHeader>
                                    <CardTitle className="text-lg text-card-foreground">Personal Details</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-card-foreground">
                                    <p><strong>Hall Ticket No:</strong> {result.personalDetails?.hallTicketNo}</p>
                                    <p><strong>Father's Name:</strong> {result.personalDetails?.fatherName}</p>
                                    <p><strong>Gender:</strong> {result.personalDetails?.gender}</p>
                                    <p><strong>Course:</strong> {result.personalDetails?.course}</p>
                                  </CardContent>
                                </Card>
                                
                                {result.marks && (
                                  <Card className="border-border bg-card">
                                    <CardHeader>
                                      <CardTitle className="text-lg text-card-foreground">Marks</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="border-border">
                                              <TableHead className="text-muted-foreground py-3 px-4">Subject Code</TableHead>
                                              <TableHead className="text-muted-foreground py-3 px-4">Subject Name</TableHead>
                                              <TableHead className="text-muted-foreground py-3 px-4">Credits</TableHead>
                                              <TableHead className="text-muted-foreground py-3 px-4">Grade Points</TableHead>
                                              <TableHead className="text-muted-foreground py-3 px-4">Grade</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {result.marks.map((mark, markIndex) => (
                                              <TableRow key={`${result.personalDetails?.hallTicketNo}-mark-${markIndex}`} className="border-border h-12">
                                                <TableCell className="text-card-foreground py-3 px-4">{mark.subCode}</TableCell>
                                                <TableCell className="text-card-foreground py-3 px-4">{mark.subjectName}</TableCell>
                                                <TableCell className="text-card-foreground py-3 px-4">{mark.credits}</TableCell>
                                                <TableCell className="text-card-foreground py-3 px-4">{mark.gradePoints}</TableCell>
                                                <TableCell className="text-card-foreground py-3 px-4">{mark.gradeSecurity}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                                
                                {result.result && (
                                  <Card className="border-border bg-card">
                                    <CardHeader>
                                      <CardTitle className="text-lg text-card-foreground">Result</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-card-foreground">
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating GitHub Icon */}
      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="https://github.com/saiabhiramjaini/ou-results-extractor"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center justify-center w-14 h-14 bg-card border-2 border-border rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 hover:border-primary"
          title="Want to contribute?"
        >
          {/* GitHub Icon */}
          <svg 
            className="w-7 h-7 text-foreground group-hover:text-primary transition-colors duration-300" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-card border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
            <p className="text-sm font-medium text-card-foreground">Want to contribute?</p>
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
          </div>
        </a>
      </div>
    </div>
  )
}

