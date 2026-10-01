import { error, redirect } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { getParsedChapters } from '$lib/server/studyCache.js';

export const load = async ({ locals, params }) => {
	const session = await locals.auth.validate();
	if ( ! session ) throw redirect( 302, '/join' );

	const studyId = parseInt( params.studyId );
	if ( isNaN( studyId ) ) throw error( 404, 'Study not found' );

	const prisma = new PrismaClient();
	try {
		const study = await prisma.LichessStudy.findFirst({
			where: { id: studyId, userId: session.user.cdUserId },
			select: { id: true, lichessId: true, name: true, pgn: true, repForWhite: true, guessedColor: true }
		});
		if ( ! study ) throw error( 404, 'Study not found' );

		let chapters;
		try {
			chapters = getParsedChapters( study.id, study.pgn );
		} catch (e) {
			throw error( 500, 'Could not parse this study: ' + e.message );
		}
		const color = study.repForWhite ?? ( study.guessedColor === 'b' ? false : true );
		return {
			study: { id: study.id, lichessId: study.lichessId, name: study.name, repForWhite: color },
			chapters
		};
	} finally {
		await prisma.$disconnect();
	}
};
