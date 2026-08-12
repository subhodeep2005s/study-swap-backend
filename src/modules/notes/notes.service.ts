import { NotesRepository } from "./notes.repository";
import type { UploadNoteBody, PresignedUrlBody } from "./notes.schema";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "@/config/s3";
import crypto from "crypto";
import { NotificationService } from "@/modules/notifications/notification.service";
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from "@/core/errors/AppError";
import { query } from "@/config/db";
import { redis } from "@/config/redis";
import { ThumbnailService } from "./thumbnail.service";
import { getS3ObjectUrl } from "@/config/s3";

export class NotesService {
  
  static formatNoteResponse(note: any) {
    if (!note) return null;
    const formatted = { ...note };
    
    // Map internal keys to public URLs
    if (formatted.file_key) {
      formatted.file_url = getS3ObjectUrl(formatted.file_key);
    } else {
      formatted.file_url = null;
    }
    
    if (formatted.thumbnail_key) {
      formatted.thumbnail_url = getS3ObjectUrl(formatted.thumbnail_key);
    } else {
      formatted.thumbnail_url = null;
    }
    
    // Process Uploader Avatar
    if (!formatted.uploader_avatar) {
      const name = formatted.uploader_name ? encodeURIComponent(formatted.uploader_name) : 'Anonymous';
      formatted.uploader_avatar_url = `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
    } else if (formatted.uploader_avatar.startsWith('http')) {
      formatted.uploader_avatar_url = formatted.uploader_avatar;
    } else {
      formatted.uploader_avatar_url = getS3ObjectUrl(formatted.uploader_avatar);
    }
    
    // Clean up internal keys
    delete formatted.file_key;
    delete formatted.thumbnail_key;
    delete formatted.uploader_avatar;
    
    return formatted;
  }
  
  static async generatePresignedUrl(userId: string, data: PresignedUrlBody) {
    const { fileName, contentType } = data;
    const fileExtension = fileName.split(".").pop();
    const uniqueId = crypto.randomBytes(8).toString("hex");
    
    const key = `notes/${userId}/${uniqueId}.${fileExtension}`;
    const url = await getPresignedUploadUrl(key, contentType, 300);
    const publicUrl = url.split("?")[0];

    return {
      uploadUrl: url,
      key,
      publicUrl,
    };
  }
  
  static async validateTaxonomyAccess(userId: string, userRole: string, data: any): Promise<void> {
    if (userRole === "admin") return; // Admin has full access

    const taxonomyIds = data.educationNodeIds || [];
    if (taxonomyIds.length > 0) {
      const placeholders = taxonomyIds.map((_: any, i: number) => `$${i + 2}`).join(',');
      const res = await query(`SELECT node_id FROM user_education_nodes WHERE user_id = $1 AND node_id IN (${placeholders})`, [userId, ...taxonomyIds]);
      if ((res?.rowCount ?? 0) === 0) {
        if (userRole === "student") {
           throw new ForbiddenError("You can only upload notes for academic areas associated with your profile.");
        } else if (userRole === "mentor") {
           throw new ForbiddenError("You are not authorized to upload notes for this academic area.");
        }
      }
    }
  }

  static async createNote(userId: string, userRole: string, data: UploadNoteBody) {
    // 1. Taxonomy Validation
    await this.validateTaxonomyAccess(userId, userRole, data);

    // 2. Duplicate Detection
    const duplicateId = await NotesRepository.checkDuplicateHash(data.fileHash);
    if (duplicateId) {
      throw new ConflictError("This file has already been uploaded to Notes Hub.", { existingNoteId: duplicateId });
    }

    // 3. Generate Thumbnail
    const thumbnailKey = await ThumbnailService.generateAndUploadThumbnail(data.fileKey, data.mimeType, userId);

    // 4. Create Note
    const note = await NotesRepository.createNote(userId, userRole, { ...data, thumbnailKey });
    return this.formatNoteResponse(note);
  }

  static async getNotes(filters: any, cursor?: string, limit: number = 20) {
    const result = await NotesRepository.getNotesWithCursor(filters, cursor, limit);
    return {
      ...result,
      items: result.items.map(this.formatNoteResponse)
    };
  }

  static async getCategories() {
    const categories = await NotesRepository.getCategoriesWithNoteCounts();
    const colors = ["#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444"];
    const icons = ["award", "book", "file-text", "zap", "star"];
    
    return categories.map((cat: any, i: number) => {
      const noteCount = parseInt(cat.note_count, 10);
      const subtitle = noteCount >= 1000 
        ? `${(noteCount / 1000).toFixed(1)}k notes` 
        : `${noteCount} notes`;
        
      return {
        id: cat.id,
        name: cat.name,
        subtitle,
        icon: icons[i % icons.length],
        color: colors[i % colors.length]
      };
    });
  }

  static async getFilters() {
    return {
      categories: ["Engineering", "Medical", "Law", "Commerce", "Arts", "Science", "School Education"],
      noteTypes: [
        'LECTURE_NOTES',
        'REVISION_NOTES',
        'SHORT_NOTES',
        'FORMULA_SHEET',
        'CHEAT_SHEET',
        'PYQ',
        'QUESTION_PAPER',
        'MOCK_TEST',
        'SOLUTION',
        'STUDY_GUIDE',
        'FLASHCARDS',
        'OTHER'
      ],
      uploaders: ["All", "Verified Educators", "Students"]
    };
  }

  static async getMyNotes(userId: string, filter: 'all' | 'published' | 'deleted', cursor?: string, limit: number = 20) {
    const result = await NotesRepository.getMyNotes(userId, filter, cursor, limit);
    return {
      ...result,
      items: result.items.map(this.formatNoteResponse)
    };
  }

  static async getNoteById(noteId: string, userId?: string) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");
    
    let isSaved = false;
    let myRating = null;

    if (userId) {
      isSaved = await NotesRepository.isNoteSaved(userId, noteId);
      myRating = await NotesRepository.getMyRating(userId, noteId);
    }
    
    return this.formatNoteResponse({ ...note, is_saved: isSaved, my_rating: myRating });
  }

  static async updateNote(noteId: string, userId: string, userRole: string, data: any) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");

    if (userRole !== "admin" && note.uploader_id !== userId) {
      throw new ForbiddenError("You can only modify your own notes.");
    }

    if (data.educationNodeIds && data.educationNodeIds.length > 0) {
       await this.validateTaxonomyAccess(userId, userRole, data);
    }
    
    let updatedData = { ...data };
    
    // If the file was replaced, regenerate thumbnail
    if (data.fileKey && data.fileKey !== note.file_key) {
      const mimeType = data.mimeType || note.mime_type;
      const thumbnailKey = await ThumbnailService.generateAndUploadThumbnail(data.fileKey, mimeType, note.uploader_id);
      if (thumbnailKey) {
         updatedData.thumbnail_key = thumbnailKey;
      }
    }

    const updatedNote = await NotesRepository.updateNote(noteId, updatedData);
    return this.formatNoteResponse(updatedNote);
  }

  static async softDeleteNote(noteId: string, userId: string, userRole: string) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");

    if (userRole !== "admin" && note.uploader_id !== userId) {
      throw new ForbiddenError("You can only delete your own notes.");
    }

    await NotesRepository.softDeleteNote(noteId, userId);

    if (userRole === "admin" && note.uploader_id !== userId) {
      NotificationService.sendToUser(note.uploader_id, "Note Removed", "Your note was removed by an admin.").catch(console.error);
    }
  }

  static async restoreNote(noteId: string, userId: string, userRole: string) {
    // We must query the DB directly because getNoteById ignores deleted notes
    const res = await query("SELECT uploader_id, deleted_at FROM notes WHERE id = $1", [noteId]);
    if (res.rowCount === 0) throw new NotFoundError("Note not found.");
    
    const note = res.rows[0]!;
    if (!note.deleted_at) throw new BadRequestError("Note is not deleted.");

    if (userRole !== "admin" && note.uploader_id !== userId) {
      throw new ForbiddenError("You can only restore your own notes.");
    }

    await NotesRepository.restoreNote(noteId);

    if (userRole === "admin" && note.uploader_id !== userId) {
      NotificationService.sendToUser(note.uploader_id, "Note Restored", "Your note was restored by an admin.").catch(console.error);
    }
  }

  static async saveNote(userId: string, noteId: string) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");

    const success = await NotesRepository.saveNote(userId, noteId);
    if (!success) throw new ConflictError("Note already saved.");

    if (note.uploader_id !== userId) {
      NotificationService.sendToUser(note.uploader_id, "New Save", "Someone saved your note.").catch(console.error);
    }
  }

  static async unsaveNote(userId: string, noteId: string) {
    const success = await NotesRepository.unsaveNote(userId, noteId);
    if (!success) throw new NotFoundError("Save record not found.");
  }

  static async getSavedNotes(userId: string) {
    const notes = await NotesRepository.getSavedNotes(userId);
    return notes.map(this.formatNoteResponse);
  }

  static async rateNote(userId: string, noteId: string, rating: number) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");

    const result = await NotesRepository.rateNote(userId, noteId, rating);

    if (note.uploader_id !== userId) {
      NotificationService.sendToUser(note.uploader_id, "New Rating", "Your note received a new rating.").catch(console.error);
    }

    return result;
  }

  static async removeRating(userId: string, noteId: string) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");

    return NotesRepository.removeRating(userId, noteId);
  }

  static async recordView(userId: string | undefined, noteId: string) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");

    // Using Redis to deduplicate views in a short period (e.g., 5 minutes)
    if (userId) {
      const redisKey = `note:view:${noteId}:${userId}`;
      const hasViewed = await redis.get(redisKey);
      if (!hasViewed) {
        await redis.setex(redisKey, 300, "1"); // 5 minutes deduplication
        await NotesRepository.incrementViews(noteId);
      }
    } else {
       await NotesRepository.incrementViews(noteId);
    }
  }

  static async recordDownload(userId: string | undefined, noteId: string) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");
    
    await NotesRepository.incrementDownloads(noteId);

    const newCount = (note.download_count || 0) + 1;
    if (newCount > 0 && (newCount === 100 || newCount === 1000 || newCount === 10000 || newCount === 100000)) {
      NotificationService.sendToUser(note.uploader_id, "Download Milestone", `Your note reached ${newCount} downloads!`).catch(console.error);
    }

    const downloadUrl = await getPresignedDownloadUrl(note.file_key, 900);
    return downloadUrl;
  }

  static async reportNote(userId: string, noteId: string, reason: string) {
    const note = await NotesRepository.getNoteById(noteId);
    if (!note) throw new NotFoundError("Note not found.");

    const success = await NotesRepository.reportNote(userId, noteId, reason);
    if (!success) throw new ConflictError("You have already reported this note for the same reason.");

    const adminRes = await query("SELECT id FROM users WHERE role = 'admin'");
    const adminIds = adminRes.rows.map(r => r.id);
    if (adminIds.length > 0) {
      NotificationService.sendPushNotifications({
        userIds: adminIds,
        title: "Note Reported",
        body: `A note has been reported for: ${reason}`
      }).catch(console.error);
    }
  }
  
  static async featureNote(noteId: string) {
     const success = await NotesRepository.featureNote(noteId);
     if (!success) throw new NotFoundError("Note not found.");

     const note = await NotesRepository.getNoteById(noteId);
     if (note) {
       NotificationService.sendToUser(note.uploader_id, "Note Featured", "Your note was featured on StudySwap!").catch(console.error);
     }
  }
  
  static async unfeatureNote(noteId: string) {
     const success = await NotesRepository.unfeatureNote(noteId);
     if (!success) throw new NotFoundError("Note not found.");
  }
  
  static async hideNote(noteId: string) {
     const success = await NotesRepository.hideNote(noteId);
     if (!success) throw new NotFoundError("Note not found.");
  }
  
  static async getContext(userId: string) {
    // This is to return recommended context based on user profile
    const profileRes = await query("SELECT country_id FROM profiles WHERE user_id = $1", [userId]);
    const countryId = profileRes.rows[0]?.country_id;
    
    const userNodesRes = await query("SELECT node_id FROM user_education_nodes WHERE user_id = $1", [userId]);
    const nodeIds = userNodesRes.rows.map(r => r.node_id);

    return {
      countryId,
      recommended: {
        nodes: nodeIds
      }
    };
  }
}
