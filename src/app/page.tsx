"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { 
  Sheet,
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetTrigger 
} from "@/components/ui/sheet";
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ResultData {
  hallTicketNo: string;
  name: string;
  gpa: string | null;
}

export default function ResultViewer() {
  const [startRoll, setStartRoll] = useState("");
  const [endRoll, setEndRoll] = useState("");
  const [results, setResults] = useState<ResultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateRollNumbers = () => {
    if (startRoll.length !== 12 || endRoll.length !== 12) {
      setError("Roll numbers must be 12 digits long.");
      return false;
    }
    if (parseInt(startRoll) > parseInt(endRoll)) {
      setError("Start roll number should be less than end roll number.");
      return false;
    }
    setError(null);
    return true;
  };

  const fetchResults = async () => {
    if (!validateRollNumbers()) return;

    setLoading(true);
    setResults([]);
    setError(null);

    try {
      for (
        let roll = parseInt(startRoll);
        roll <= parseInt(endRoll);
        roll++
      ) {
        const htno = roll.toString().padStart(12, '0');
        const response = await fetch("/api/result", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ htno }),
        });

        if (response.ok) {
          const data = await response.json();
          setResults(prevResults => [...prevResults, data]);
        } else {
          const errorData = await response.json();
          console.error(`Error fetching result for ${htno}:`, errorData.error);
        }
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
      setError("Failed to fetch results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('results-table');
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('results.pdf');

      console.log("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-2xl font-bold text-gray-800">Results Viewer</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="startRoll" className="text-sm font-medium text-gray-700">Start Roll Number</Label>
              <Input
                id="startRoll"
                value={startRoll}
                onChange={(e) => setStartRoll(e.target.value)}
                placeholder="Enter 12 digit roll number"
                maxLength={12}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endRoll" className="text-sm font-medium text-gray-700">End Roll Number</Label>
              <Input
                id="endRoll"
                value={endRoll}
                onChange={(e) => setEndRoll(e.target.value)}
                placeholder="Enter 12 digit roll number"
                maxLength={12}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <Button 
              onClick={fetchResults} 
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fetch Results
            </Button>
            
            {results.length > 0 && (
              <Button
                onClick={downloadPDF}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-6 overflow-x-auto" id="results-table">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll Number</TableHead>
                    <TableHead className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</TableHead>
                    <TableHead className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GPA</TableHead>
                    <TableHead className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.hallTicketNo} className="hover:bg-gray-50">
                      <TableCell className="py-2">{result.hallTicketNo}</TableCell>
                      <TableCell className="py-2">{result.name}</TableCell>
                      <TableCell className="py-2">{result.gpa || 'N/A'}</TableCell>
                      <TableCell className="py-2">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedResult(result)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Details
                            </Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle className="text-xl font-bold mb-4">Student Details</SheetTitle>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Roll Number</Label>
                                <p className="text-sm mt-1">{selectedResult?.hallTicketNo}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Name</Label>
                                <p className="text-sm mt-1">{selectedResult?.name}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">GPA</Label>
                                <p className="text-sm mt-1">{selectedResult?.gpa || 'N/A'}</p>
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}