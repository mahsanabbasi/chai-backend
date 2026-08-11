import mongoose, {Schema} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const videoSchema = new Schema({
  videoFile: {
    type: String, // cloudinary url
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String, // cloudinary url
    required: true,
  },
  duration: {
    type: Number,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {timestamps: true}); 

videoSchema.plugin(mongoosePaginate);

//const result = await Video.paginate({}, { page: 1, limit: 10 });
//Ye sirf 10 videos ek dafa mein deta hai (page 1), agla batch alag request se. Bilkul jaise YouTube pe "load more" ya pagination hoti hai

export const Video = mongoose.model('Video', videoSchema);