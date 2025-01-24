import mongoose, { Document, Model } from "mongoose";

export interface IWatchHistoryBase {
  userId: mongoose.Types.ObjectId;
  movieId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  currentTime: number;
  duration: number;
  completed: boolean;
  watchedAt: Date;
  lastPlayedAt: Date;
  progress: number;
  quality: "360p" | "480p" | "720p" | "1080p";
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface IWatchHistory extends IWatchHistoryBase, Document {
  isCompleted(): boolean;
  getProgress(): number;
  updateProgress(currentTime: number): void;
}

interface IWatchHistoryModel extends Model<IWatchHistory> {
  getUserHistory(
    userId: mongoose.Types.ObjectId,
    limit?: number
  ): Promise<IWatchHistory[]>;
  getContinueWatching(
    userId: mongoose.Types.ObjectId,
    mediaType?: "movie" | "tv",
    limit?: number
  ): Promise<IWatchHistory[]>;
  getWhatToWatchTonight(userId: mongoose.Types.ObjectId): Promise<any[]>;
  updateWatchProgress(
    userId: mongoose.Types.ObjectId,
    movieId: number,
    currentTime: number,
    duration: number
  ): Promise<IWatchHistory>;
}

const watchHistorySchema = new mongoose.Schema<IWatchHistory>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movieId: { type: Number, required: true },
    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      required: true,
    },
    title: { type: String, required: true },
    posterPath: { type: String },
    currentTime: { type: Number, default: 0 },
    duration: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    watchedAt: { type: Date, default: Date.now },
    lastPlayedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 },
    quality: {
      type: String,
      enum: ["360p", "480p", "720p", "1080p"],
      default: "720p",
    },
    seasonNumber: { type: Number },
    episodeNumber: { type: Number },
  },
  { timestamps: true }
);

// Indexes
watchHistorySchema.index({ userId: 1, movieId: 1 }, { unique: true });
watchHistorySchema.index({ userId: 1, watchedAt: -1 });
watchHistorySchema.index({ userId: 1, completed: 1 });

watchHistorySchema.methods.isCompleted = function (): boolean {
  return this.completed;
};

watchHistorySchema.methods.getProgress = function (): number {
  return this.progress;
};

watchHistorySchema.methods.updateProgress = function (
  currentTime: number
): void {
  this.currentTime = currentTime;
  this.progress = Math.round((currentTime / this.duration) * 100);
  this.completed = this.progress > 90;
  this.lastPlayedAt = new Date();
};

watchHistorySchema.statics.getUserHistory = async function (
  userId: mongoose.Types.ObjectId,
  limit: number = 10
): Promise<IWatchHistory[]> {
  return this.find({ userId })
    .sort({ lastPlayedAt: -1 })
    .limit(limit)
    .select("-__v");
};

watchHistorySchema.statics.getContinueWatching = async function (
  userId: mongoose.Types.ObjectId,
  mediaType?: "movie" | "tv",
  limit: number = 10
): Promise<IWatchHistory[]> {
  const query = {
    userId,
    completed: false,
    progress: { $gt: 0, $lt: 90 },
    ...(mediaType && { mediaType }),
  };

  return this.find(query)
    .sort({ lastPlayedAt: -1 })
    .limit(limit)
    .select("-__v");
};

watchHistorySchema.statics.updateWatchProgress = async function (
  userId: mongoose.Types.ObjectId,
  movieId: number,
  mediaType: "movie" | "tv",
  currentTime: number,
  duration: number,
  seasonNumber?: number,
  episodeNumber?: number
): Promise<IWatchHistory> {
  const progress = Math.round((currentTime / duration) * 100);
  const completed = progress > 90;

  const updateData = {
    currentTime,
    duration,
    progress,
    completed,
    lastPlayedAt: new Date(),
    ...(seasonNumber && { seasonNumber }),
    ...(episodeNumber && { episodeNumber }),
  };

  return this.findOneAndUpdate({ userId, movieId, mediaType }, updateData, {
    new: true,
    upsert: true,
  });
};

const WatchHistoryModel = mongoose.model<IWatchHistory, IWatchHistoryModel>("WatchHistory", watchHistorySchema);

export default WatchHistoryModel;