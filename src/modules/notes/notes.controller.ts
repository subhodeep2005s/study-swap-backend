import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import { NotesService } from "./notes.service";

export class NotesController {
  
  static generatePresignedUrl = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = await NotesService.generatePresignedUrl(userId, req.body);
    
    res.status(200).json({
      success: true,
      message: "Presigned URL generated successfully",
      data,
    });
  });

  static createNote = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    const note = await NotesService.createNote(userId, userRole, req.body);
    
    res.status(201).json({
      success: true,
      message: "Note published successfully",
      data: note,
    });
  });

  static getNotes = asyncHandler(async (req: Request, res: Response) => {
    const { cursor, limit, ...filters } = req.query as any;
    
    const result = await NotesService.getNotes(filters, cursor, limit ? Number(limit) : undefined);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  });

  static getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await NotesService.getCategories();
    res.status(200).json({
      success: true,
      data: categories
    });
  });

  static getFilters = asyncHandler(async (req: Request, res: Response) => {
    const filters = await NotesService.getFilters();
    res.status(200).json({
      success: true,
      data: filters
    });
  });

  static getMyNotes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { filter, cursor, limit } = req.query as any;
    
    const result = await NotesService.getMyNotes(userId, filter, cursor, limit ? Number(limit) : undefined);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  });

  static getSavedNotes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notes = await NotesService.getSavedNotes(userId);
    
    res.status(200).json({
      success: true,
      data: { items: notes },
    });
  });

  static getNoteById = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user?.id; // Optional, might be public, but usually requires auth
    
    const note = await NotesService.getNoteById(noteId, userId);
    
    res.status(200).json({
      success: true,
      data: note,
    });
  });

  static updateNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    const note = await NotesService.updateNote(noteId, userId, userRole, req.body);
    
    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: note,
    });
  });

  static deleteNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    await NotesService.softDeleteNote(noteId, userId, userRole);
    
    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  });

  static restoreNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    await NotesService.restoreNote(noteId, userId, userRole);
    
    res.status(200).json({
      success: true,
      message: "Note restored successfully",
    });
  });

  static saveNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    
    await NotesService.saveNote(userId, noteId);
    
    res.status(200).json({
      success: true,
      message: "Note saved successfully",
    });
  });

  static unsaveNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    
    await NotesService.unsaveNote(userId, noteId);
    
    res.status(200).json({
      success: true,
      message: "Note removed from saved",
    });
  });

  static rateNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    const { rating } = req.body;
    
    const result = await NotesService.rateNote(userId, noteId, rating);
    
    res.status(200).json({
      success: true,
      message: "Note rated successfully",
      data: result,
    });
  });
  
  static removeRating = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    
    const result = await NotesService.removeRating(userId, noteId);
    
    res.status(200).json({
      success: true,
      message: "Rating removed successfully",
      data: result,
    });
  });

  static reportNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user!.id;
    const { reason } = req.body;
    
    await NotesService.reportNote(userId, noteId, reason);
    
    res.status(200).json({
      success: true,
      message: "Note reported successfully",
    });
  });

  static recordView = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user?.id;
    
    await NotesService.recordView(userId, noteId);
    
    res.status(200).json({
      success: true,
      message: "View recorded",
    });
  });

  static recordDownload = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    const userId = req.user?.id;
    
    const downloadUrl = await NotesService.recordDownload(userId, noteId);
    
    res.status(200).json({
      success: true,
      message: "Download recorded",
      data: { downloadUrl }
    });
  });

  static getContext = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    const context = await NotesService.getContext(userId);
    
    res.status(200).json({
      success: true,
      data: context,
    });
  });
  
  static featureNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    
    await NotesService.featureNote(noteId);
    
    res.status(200).json({
      success: true,
      message: "Note featured successfully",
    });
  });

  static unfeatureNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    
    await NotesService.unfeatureNote(noteId);
    
    res.status(200).json({
      success: true,
      message: "Note unfeatured successfully",
    });
  });

  static hideNote = asyncHandler(async (req: Request, res: Response) => {
    const noteId = req.params.id as string;
    
    await NotesService.hideNote(noteId);
    
    res.status(200).json({
      success: true,
      message: "Note hidden successfully",
    });
  });
}
